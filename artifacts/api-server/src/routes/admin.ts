import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { db, userProfilesTable, userCardsTable, userDecksTable } from "@workspace/db";
import { ALL_CARDS, isValidCardId } from "../lib/cardsCatalog";
import { logger } from "../lib/logger";

const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "sd73james";
const ADMIN_USERNAME = process.env["ADMIN_USERNAME"] ?? "admin";

if (!process.env["ADMIN_PASSWORD"]) {
  logger.warn(
    "ADMIN_PASSWORD env var not set — falling back to the default password. " +
    "Set ADMIN_PASSWORD in production to override.",
  );
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const pwd = req.header("x-admin-password");
  if (!pwd || pwd !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

const router: IRouter = Router();

// POST /api/admin/login — just verifies creds.
router.post("/admin/login", (req, res) => {
  const { username, password } = req.body as { username?: unknown; password?: unknown };
  if (typeof username !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Missing credentials" });
    return;
  }
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Bad credentials" });
    return;
  }
  res.json({ ok: true });
});

// GET /api/admin/users — list every user profile with their owned card IDs.
router.get("/admin/users", requireAdmin, async (_req, res) => {
  const profiles = await db.select().from(userProfilesTable);
  const cards    = await db.select().from(userCardsTable);
  const cardsByUser: Record<string, string[]> = {};
  for (const c of cards) {
    (cardsByUser[c.clerkUserId] ??= []).push(c.cardId);
  }
  res.json({
    users: profiles.map((p) => ({
      clerkUserId: p.clerkUserId,
      displayName: p.displayName,
      level: p.level,
      wins: p.wins,
      losses: p.losses,
      gold: p.gold,
      ownedCards: cardsByUser[p.clerkUserId] ?? [],
    })),
    allCards: ALL_CARDS,
  });
});

// POST /api/admin/grant-card { target: "all" | "<userId>", cardId }
router.post("/admin/grant-card", requireAdmin, async (req, res) => {
  const { target, cardId } = req.body as { target?: unknown; cardId?: unknown };
  if (typeof target !== "string" || typeof cardId !== "string" || !isValidCardId(cardId)) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  let targetIds: string[];
  if (target === "all") {
    const all = await db.select({ id: userProfilesTable.clerkUserId }).from(userProfilesTable);
    targetIds = all.map((r) => r.id);
  } else {
    // Validate the target user actually exists to avoid orphan card rows.
    const found = await db
      .select({ id: userProfilesTable.clerkUserId })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.clerkUserId, target))
      .limit(1);
    if (found.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    targetIds = [target];
  }

  let granted = 0;
  for (const userId of targetIds) {
    const existing = await db
      .select()
      .from(userCardsTable)
      .where(eq(userCardsTable.clerkUserId, userId));
    if (existing.some((c) => c.cardId === cardId)) continue;
    await db
      .insert(userCardsTable)
      .values({ clerkUserId: userId, cardId, count: 1 })
      .onConflictDoNothing();
    granted += 1;
  }

  res.json({ ok: true, granted, total: targetIds.length });
});

// POST /api/admin/remove-card { target: "all" | "<userId>", cardId }
// Removes the card from the target's collection AND strips it from every deck the
// affected user(s) own, so saved decks don't reference cards they no longer have.
router.post("/admin/remove-card", requireAdmin, async (req, res) => {
  const { target, cardId } = req.body as { target?: unknown; cardId?: unknown };
  if (typeof target !== "string" || typeof cardId !== "string" || !isValidCardId(cardId)) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  let targetIds: string[];
  if (target === "all") {
    const all = await db.select({ id: userProfilesTable.clerkUserId }).from(userProfilesTable);
    targetIds = all.map((r) => r.id);
  } else {
    const found = await db
      .select({ id: userProfilesTable.clerkUserId })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.clerkUserId, target))
      .limit(1);
    if (found.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    targetIds = [target];
  }

  let removed = 0;
  for (const userId of targetIds) {
    const del = await db
      .delete(userCardsTable)
      .where(and(eq(userCardsTable.clerkUserId, userId), eq(userCardsTable.cardId, cardId)))
      .returning({ id: userCardsTable.cardId });
    if (del.length > 0) removed += 1;

    // Repair any deck that referenced the removed card. We strip the card and try
    // to backfill from the user's remaining owned cards so the deck stays at 8.
    // If the user owns fewer than 8 cards total, the deck stays short — engine
    // start-up code already treats non-8 decks as invalid and falls back safely.
    const ownedRows = await db
      .select({ cardId: userCardsTable.cardId })
      .from(userCardsTable)
      .where(eq(userCardsTable.clerkUserId, userId));
    const ownedSet = new Set(ownedRows.map((r) => r.cardId));

    const decks = await db.select().from(userDecksTable).where(eq(userDecksTable.clerkUserId, userId));
    for (const d of decks) {
      if (!d.cardIds.includes(cardId)) continue;
      const kept = d.cardIds.filter((c) => c !== cardId && ownedSet.has(c));
      const inDeck = new Set(kept);
      const candidates = [...ownedSet].filter((c) => !inDeck.has(c));
      while (kept.length < 8 && candidates.length > 0) {
        kept.push(candidates.shift()!);
      }
      await db
        .update(userDecksTable)
        .set({ cardIds: kept })
        .where(and(eq(userDecksTable.clerkUserId, userId), eq(userDecksTable.slot, d.slot)));
    }
  }

  res.json({ ok: true, removed, total: targetIds.length });
});

export default router;
