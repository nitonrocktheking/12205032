import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

const FLAG_COOKIE = "frg_guest";

export function hasGuestCookie(): boolean {
  return document.cookie.split("; ").some((c) => c.startsWith(`${FLAG_COOKIE}=`));
}

// Reactive variant. We can't subscribe to cookie changes, so we re-check on
// mount + when a custom `frg-guest-changed` event fires (we dispatch this
// after start/end so the rest of the UI updates immediately).
export function useIsGuest(): boolean {
  const [v, setV] = useState<boolean>(() => hasGuestCookie());
  useEffect(() => {
    const handler = () => setV(hasGuestCookie());
    window.addEventListener("frg-guest-changed", handler);
    return () => window.removeEventListener("frg-guest-changed", handler);
  }, []);
  return v;
}

export async function startGuestSession(): Promise<{ ok: true; username: string }> {
  const r = await fetch(api("/auth/guest"), {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) throw new Error(`guest_start ${r.status}`);
  const body = await r.json();
  window.dispatchEvent(new CustomEvent("frg-guest-changed"));
  return body;
}

export function endGuestSessionBeacon(): void {
  if (!hasGuestCookie()) return;
  // sendBeacon is the only reliable way to fire a request during page unload.
  // It POSTs in the background, includes cookies (same-origin), and the
  // browser keeps it alive across navigation/close.
  try {
    const blob = new Blob(["{}"], { type: "application/json" });
    navigator.sendBeacon(api("/auth/guest/end"), blob);
  } catch {
    // Best-effort. If the beacon fails the user row is orphaned until manual
    // cleanup, which is acceptable for an ephemeral feature.
  }
}

/** Mount once at the app root. While the guest cookie is present, fires the
 *  cleanup beacon on `pagehide` (reload, tab close, navigate-away). React
 *  Router client-side nav does NOT trigger `pagehide`, so guests stay alive
 *  while exploring the app. */
export function GuestExitHandler(): null {
  useEffect(() => {
    const onHide = () => endGuestSessionBeacon();
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);
  return null;
}

/** Called when the user explicitly leaves guest mode (currently unused, but
 *  exposed for completeness — e.g. a future "Quitter le mode invité" button). */
export function useEndGuestSession() {
  const qc = useQueryClient();
  return async () => {
    if (!hasGuestCookie()) return;
    try {
      await fetch(api("/auth/guest/end"), { method: "POST", credentials: "include" });
    } catch {
      /* ignored */
    }
    window.dispatchEvent(new CustomEvent("frg-guest-changed"));
    qc.clear();
  };
}
