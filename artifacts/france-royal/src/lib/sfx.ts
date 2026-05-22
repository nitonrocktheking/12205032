const BASE = import.meta.env.BASE_URL;
const STORAGE_KEY = "fr-sfx-muted";

export type SfxName =
  | "card_play"
  | "tower_destroyed"
  | "victory"
  | "defeat"
  | "double_elixir"
  | "denied";

const FILES: Record<SfxName, string> = {
  card_play: `${BASE}sfx/card_play.mp3`,
  tower_destroyed: `${BASE}sfx/tower_destroyed.mp3`,
  victory: `${BASE}sfx/victory.mp3`,
  defeat: `${BASE}sfx/defeat.mp3`,
  double_elixir: `${BASE}sfx/double_elixir.mp3`,
  denied: `${BASE}sfx/denied.mp3`,
};

const VOLUME: Record<SfxName, number> = {
  card_play: 0.5,
  tower_destroyed: 0.7,
  victory: 0.7,
  defeat: 0.7,
  double_elixir: 0.6,
  denied: 0.35,
};

const cache: Partial<Record<SfxName, HTMLAudioElement>> = {};
let muted = (() => {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
})();
const listeners = new Set<(m: boolean) => void>();

function preload(name: SfxName): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  let a = cache[name];
  if (!a) {
    a = new Audio(FILES[name]);
    a.preload = "auto";
    a.volume = VOLUME[name];
    cache[name] = a;
  }
  return a;
}

export function preloadAll() {
  (Object.keys(FILES) as SfxName[]).forEach(preload);
}

// Browsers gate audio behind a user gesture. A navigation click before the
// game page does NOT grant durable activation for later RAF-triggered sounds
// (tower destroyed, double-elixir, gameover), so we silently play+pause one
// preloaded clip on the first in-page pointer/key/touch event. After that,
// subsequent `play()` calls from timers/RAF are allowed by the autoplay policy.
let unlocked = false;
export function installAudioUnlock() {
  if (typeof window === "undefined" || unlocked) return;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    const a = preload("card_play");
    if (a) {
      const prevVol = a.volume;
      a.volume = 0;
      a.play().then(() => { a.pause(); a.currentTime = 0; a.volume = prevVol; }).catch(() => { a.volume = prevVol; });
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: false });
  window.addEventListener("keydown", unlock, { once: false });
  window.addEventListener("touchstart", unlock, { once: false });
}

export function playSfx(name: SfxName) {
  if (muted) return;
  const base = preload(name);
  if (!base) return;
  // Clone so the sound can overlap with itself (e.g. two cards in quick succession).
  try {
    const node = base.cloneNode(true) as HTMLAudioElement;
    node.volume = VOLUME[name];
    void node.play().catch(() => {});
  } catch {
    // Fall back to restarting the cached node.
    try { base.currentTime = 0; void base.play().catch(() => {}); } catch { /* noop */ }
  }
}

export function isMuted(): boolean { return muted; }

export function setMuted(next: boolean) {
  muted = next;
  try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch { /* noop */ }
  listeners.forEach((l) => l(next));
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

export function subscribeMuted(cb: (m: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
