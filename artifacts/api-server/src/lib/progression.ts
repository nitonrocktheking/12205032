import { db, userCardsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UNLOCKABLE_CARDS } from "./cardsCatalog";

// ─── XP formula ──────────────────────────────────────────────────────────────
// XP to advance FROM `level` TO `level+1`. Slight scaling so later levels
// require a bit more effort. Win = 30 XP, loss = 5 XP, draw = 10 XP.
//   level 1→2 = 100 XP  (≈ 3-4 wins)
//   level 2→3 = 125 XP
//   level 5→6 = 200 XP
export function xpPerLevel(level: number): number {
  return 100 + Math.max(0, level - 1) * 25;
}

// Cumulative XP required to reach `level` from level 1.
//   xpToReach(1) = 0
//   xpToReach(2) = 100
//   xpToReach(3) = 225
export function xpToReach(level: number): number {
  if (level <= 1) return 0;
  let sum = 0;
  for (let i = 1; i < level; i++) sum += xpPerLevel(i);
  return sum;
}

// Derive level from total cumulative XP. Authoritative — DB `level` column is a
// cached convenience and gets re-synced whenever we read or write XP.
export function levelFromXp(xp: number): number {
  let level = 1;
  // Safe upper bound: level 100 needs ~135k XP, far beyond realistic play.
  while (level < 200 && xpToReach(level + 1) <= xp) level++;
  return level;
}

export interface ProgressionEntry {
  cardId: string;
  level: number;     // level at which this card unlocks
  xpRequired: number; // total XP required to reach that level
}

// One unlockable card per level, starting at level 2.
// Stable order — based on UNLOCKABLE_CARDS list.
export const UNLOCK_PROGRESSION: ProgressionEntry[] = UNLOCKABLE_CARDS.map(
  (cardId, i) => {
    const level = i + 2;
    return { cardId, level, xpRequired: xpToReach(level) };
  },
);

// Grant every unlockable card whose threshold ≤ `level` if the user doesn't
// already own it. Returns the list of card IDs newly granted.
export async function syncUnlocksForLevel(
  userId: string,
  level: number,
): Promise<string[]> {
  const eligible = UNLOCK_PROGRESSION.filter((e) => e.level <= level).map(
    (e) => e.cardId,
  );
  if (eligible.length === 0) return [];

  const owned = await db
    .select({ cardId: userCardsTable.cardId })
    .from(userCardsTable)
    .where(eq(userCardsTable.clerkUserId, userId));
  const ownedSet = new Set(owned.map((c) => c.cardId));

  const toGrant = eligible.filter((c) => !ownedSet.has(c));
  if (toGrant.length === 0) return [];

  await db
    .insert(userCardsTable)
    .values(toGrant.map((c) => ({ clerkUserId: userId, cardId: c, count: 1 })))
    .onConflictDoNothing();

  return toGrant;
}
