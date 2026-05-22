import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, userProfilesTable, userCardsTable, userDecksTable } from "@workspace/db";
import { STARTER_CARDS } from "../lib/cardsCatalog";
import {
  GUEST_COOKIE,
  GUEST_FLAG_COOKIE,
  GUEST_TTL_SECONDS,
  newGuestUserId,
  signGuestToken,
  verifyGuestToken,
} from "../lib/guestSession";
import { randomGuestUsername } from "../lib/guestNames";

const router: IRouter = Router();

const isProd = process.env["NODE_ENV"] === "production";

function setGuestCookies(res: Response, token: string) {
  res.cookie(GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: GUEST_TTL_SECONDS * 1000,
  });
  // Non-HttpOnly companion so the client can detect "I'm in guest mode" without
  // hitting the server. Value is meaningless — presence is what matters.
  res.cookie(GUEST_FLAG_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: GUEST_TTL_SECONDS * 1000,
  });
}

function clearGuestCookies(res: Response) {
  res.clearCookie(GUEST_COOKIE, { path: "/" });
  res.clearCookie(GUEST_FLAG_COOKIE, { path: "/" });
}

// POST /api/auth/guest — provision a brand-new throwaway profile.
router.post("/auth/guest", async (req: Request, res: Response) => {
  const userId = newGuestUserId();

  // Pick a unique-ish username. The display_name lower-cased unique index will
  // ultimately enforce uniqueness; we retry on conflict a few times to make
  // collisions invisible to the user.
  let username = randomGuestUsername();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await db.insert(userProfilesTable).values({ clerkUserId: userId, displayName: username });
      break;
    } catch (e: unknown) {
      const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : undefined;
      if (code === "23505" && attempt < 4) {
        // unique violation on display_name — try a new one
        username = randomGuestUsername();
        continue;
      }
      req.log.error({ err: e }, "Failed to create guest profile");
      res.status(500).json({ error: "Failed to create guest" });
      return;
    }
  }

  // Seed starter cards + default deck, same shape as a real account.
  await db.insert(userCardsTable)
    .values(STARTER_CARDS.map((c) => ({ clerkUserId: userId, cardId: c, count: 1 })))
    .onConflictDoNothing();
  await db.insert(userDecksTable)
    .values({ clerkUserId: userId, slot: 0, cardIds: [...STARTER_CARDS] })
    .onConflictDoNothing();

  setGuestCookies(res, signGuestToken(userId));
  req.log.info({ userId, username }, "Guest profile created");
  res.json({ ok: true, username });
});

// POST /api/auth/guest/end — purge the guest user.
// Called from `pagehide` via navigator.sendBeacon, so we must not require any
// custom headers and must respond quickly. The browser ignores the body anyway.
router.post("/auth/guest/end", async (req: Request, res: Response) => {
  const token = (req.cookies as Record<string, string> | undefined)?.[GUEST_COOKIE];
  const userId = verifyGuestToken(token);
  clearGuestCookies(res);
  if (!userId) {
    res.status(204).end();
    return;
  }
  try {
    // Cascade: cards + decks first (no FK in schema, so delete by id), then profile.
    await db.delete(userCardsTable).where(eq(userCardsTable.clerkUserId, userId));
    await db.delete(userDecksTable).where(eq(userDecksTable.clerkUserId, userId));
    await db.delete(userProfilesTable).where(eq(userProfilesTable.clerkUserId, userId));
    req.log.info({ userId }, "Guest profile deleted");
  } catch (e) {
    req.log.error({ err: e, userId }, "Failed to delete guest profile");
  }
  res.status(204).end();
});

export default router;
