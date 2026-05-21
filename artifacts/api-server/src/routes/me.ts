import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import { db, userProfilesTable, userCardsTable, userDecksTable } from "@workspace/db";
import { ALL_CARDS, STARTER_CARDS, UNLOCKABLE_CARDS, isValidCardId } from "../lib/cardsCatalog";

interface AuthedRequest extends Request {
  userId?: string;
}

const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId as string | undefined ?? auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
};

// Blocks progression/economy mutations until the player has picked a unique pseudo.
// Combined with the client-side RequireUsername gate so the requirement can't be
// bypassed by hitting the API directly (e.g. by deep-linking /results).
async function requireUsernameSet(userId: string, res: Response): Promise<boolean> {
  const [p] = await db.select({ name: userProfilesTable.displayName })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId))
    .limit(1);
  if (!p || !p.name) {
    res.status(412).json({ error: "USERNAME_REQUIRED" });
    return false;
  }
  return true;
}

// Just-in-time provisioning: ensure user has a profile, starter cards, and a default deck.
// displayName is intentionally left NULL — the client must collect it via /username-setup
// before allowing any further interaction. Most routes still operate without a displayName.
async function ensureProvisioned(userId: string) {
  const existing = await db.select().from(userProfilesTable).where(eq(userProfilesTable.clerkUserId, userId)).limit(1);
  if (existing.length > 0) return;

  await db.insert(userProfilesTable).values({ clerkUserId: userId }).onConflictDoNothing();
  await db.insert(userCardsTable)
    .values(STARTER_CARDS.map((c) => ({ clerkUserId: userId, cardId: c, count: 1 })))
    .onConflictDoNothing();
  await db.insert(userDecksTable)
    .values({ clerkUserId: userId, slot: 0, cardIds: [...STARTER_CARDS] })
    .onConflictDoNothing();
}

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

const router: IRouter = Router();

// GET /api/me — returns profile + owned cards + decks
router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  await ensureProvisioned(userId);

  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.clerkUserId, userId)).limit(1);
  const cards    = await db.select().from(userCardsTable).where(eq(userCardsTable.clerkUserId, userId));
  const decks    = await db.select().from(userDecksTable).where(eq(userDecksTable.clerkUserId, userId));

  res.json({ profile, cards, decks, allCards: ALL_CARDS, starterCards: STARTER_CARDS });
});

// PUT /api/me/decks/:slot — save a deck
router.put("/me/decks/:slot", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const slot = Number(req.params.slot);
  if (!Number.isInteger(slot) || slot < 0 || slot > 2) {
    res.status(400).json({ error: "Invalid slot" }); return;
  }
  if (!(await requireUsernameSet(userId, res))) return;
  const { cardIds } = req.body as { cardIds?: unknown };
  if (!Array.isArray(cardIds) || cardIds.length !== 8) {
    res.status(400).json({ error: "Deck must contain exactly 8 cards" }); return;
  }
  for (const id of cardIds) {
    if (typeof id !== "string" || !isValidCardId(id)) {
      res.status(400).json({ error: `Invalid card id: ${String(id)}` }); return;
    }
  }
  if (new Set(cardIds).size !== 8) {
    res.status(400).json({ error: "Cards must be unique" }); return;
  }

  // Verify all cards are owned
  const owned = await db.select().from(userCardsTable).where(eq(userCardsTable.clerkUserId, userId));
  const ownedSet = new Set(owned.map((c) => c.cardId));
  for (const id of cardIds) {
    if (!ownedSet.has(id)) {
      res.status(400).json({ error: `Card not owned: ${id}` }); return;
    }
  }

  await db.insert(userDecksTable)
    .values({ clerkUserId: userId, slot, cardIds: cardIds as string[] })
    .onConflictDoUpdate({
      target: [userDecksTable.clerkUserId, userDecksTable.slot],
      set: { cardIds: cardIds as string[] },
    });

  res.json({ ok: true });
});

// PUT /api/me/selected-deck — pick which deck slot is active
router.put("/me/selected-deck", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { slot } = req.body as { slot?: unknown };
  if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 0 || slot > 2) {
    res.status(400).json({ error: "Invalid slot" }); return;
  }
  await db.update(userProfilesTable)
    .set({ selectedDeckSlot: slot })
    .where(eq(userProfilesTable.clerkUserId, userId));
  res.json({ ok: true });
});

// POST /api/me/match-result — record result; on win, maybe unlock a new card
router.post("/me/match-result", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  await ensureProvisioned(userId);
  if (!(await requireUsernameSet(userId, res))) return;
  const { result } = req.body as { result?: unknown };
  if (result !== "win" && result !== "loss" && result !== "draw") {
    res.status(400).json({ error: "Invalid result" }); return;
  }

  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.clerkUserId, userId)).limit(1);
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  const xpGain  = result === "win" ? 30 : result === "draw" ? 10 : 5;
  const goldGain = result === "win" ? 50 : result === "draw" ? 15 : 5;
  const newXp    = profile.xp + xpGain;
  const newLevel = 1 + Math.floor(newXp / 200);

  // Try to unlock a new card on win
  let unlockedCard: string | null = null;
  if (result === "win") {
    const owned = await db.select().from(userCardsTable).where(eq(userCardsTable.clerkUserId, userId));
    const ownedSet = new Set(owned.map((c) => c.cardId));
    const locked = UNLOCKABLE_CARDS.filter((c) => !ownedSet.has(c));
    if (locked.length > 0) {
      unlockedCard = locked[Math.floor(Math.random() * locked.length)];
      await db.insert(userCardsTable)
        .values({ clerkUserId: userId, cardId: unlockedCard, count: 1 })
        .onConflictDoNothing();
    }
  }

  await db.update(userProfilesTable)
    .set({
      xp: newXp,
      level: newLevel,
      gold: profile.gold + goldGain,
      wins: profile.wins + (result === "win"  ? 1 : 0),
      losses: profile.losses + (result === "loss" ? 1 : 0),
    })
    .where(eq(userProfilesTable.clerkUserId, userId));

  res.json({
    xpGain, goldGain,
    newLevel, leveledUp: newLevel > profile.level,
    unlockedCard,
  });
});

// POST /api/me/username — set or change the player's unique pseudo
router.post("/me/username", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  await ensureProvisioned(userId);
  const { username } = req.body as { username?: unknown };
  if (typeof username !== "string") {
    res.status(400).json({ error: "Pseudo invalide" }); return;
  }
  const trimmed = username.trim();
  if (!USERNAME_RE.test(trimmed)) {
    res.status(400).json({ error: "Le pseudo doit faire 3 à 20 caractères (lettres, chiffres, _ ou -)." }); return;
  }

  // Case-insensitive uniqueness check (DB unique index is case-sensitive, so we also check here).
  const lower = trimmed.toLowerCase();
  const allProfiles = await db
    .select({ id: userProfilesTable.clerkUserId, name: userProfilesTable.displayName })
    .from(userProfilesTable);
  const taken = allProfiles.find(
    (p) => p.id !== userId && p.name && p.name.toLowerCase() === lower,
  );
  if (taken) {
    res.status(409).json({ error: "Ce pseudo est déjà pris." }); return;
  }

  try {
    await db.update(userProfilesTable)
      .set({ displayName: trimmed })
      .where(eq(userProfilesTable.clerkUserId, userId));
  } catch (e: unknown) {
    // PG unique constraint violation
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "23505") {
      res.status(409).json({ error: "Ce pseudo est déjà pris." }); return;
    }
    throw e;
  }
  res.json({ ok: true, username: trimmed });
});

// POST /api/me/tutorial-done
router.post("/me/tutorial-done", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  await ensureProvisioned(userId);
  await db.update(userProfilesTable)
    .set({ tutorialDone: 1 })
    .where(eq(userProfilesTable.clerkUserId, userId));
  res.json({ ok: true });
});

// Suppress unused 'and' import warning by referencing it once in dev
void and;

export default router;
