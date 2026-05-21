import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, userProfilesTable, userCardsTable } from "@workspace/db";
import { ALL_CARDS, isValidCardId } from "../lib/cardsCatalog";

const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "pouletos";
const ADMIN_USERNAME = process.env["ADMIN_USERNAME"] ?? "admin";

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

export default router;
