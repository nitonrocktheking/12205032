import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Guest sessions are stateless: the cookie carries the userId + an HMAC of it
// signed with SESSION_SECRET. No server-side store is needed — the user row in
// PostgreSQL is the only persistent state, and we wipe it on `pagehide`.

export const GUEST_COOKIE = "frg_guest_session";
// Companion non-HttpOnly cookie so the browser can detect "I'm a guest" without
// needing a server round-trip. The signed cookie above stays HttpOnly.
export const GUEST_FLAG_COOKIE = "frg_guest";
export const GUEST_TTL_SECONDS = 60 * 60 * 4; // 4h hard cap; reload kills it sooner

const ALG = "sha256";

function getSecret(): string {
  const s = process.env["SESSION_SECRET"];
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

export function newGuestUserId(): string {
  // 16 hex chars → fits in user_profiles.clerk_user_id (text). Prefixed so we
  // can never collide with a real Clerk userId (those start with `user_`).
  return `guest_${randomBytes(8).toString("hex")}`;
}

export function signGuestToken(userId: string): string {
  const mac = createHmac(ALG, getSecret()).update(userId).digest("hex");
  return `${userId}.${mac}`;
}

export function verifyGuestToken(token: string | undefined): string | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  if (!userId.startsWith("guest_")) return null;
  const expected = createHmac(ALG, getSecret()).update(userId).digest("hex");
  // Length check before timingSafeEqual to avoid throwing on mismatched lengths.
  if (mac.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(expected, "hex"))) return null;
  } catch {
    return null;
  }
  return userId;
}
