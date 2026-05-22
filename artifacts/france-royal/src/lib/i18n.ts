import { fr } from "../locales/fr";
import { en } from "../locales/en";
import { es } from "../locales/es";

export type Lang = "fr" | "en" | "es";
export const SUPPORTED_LANGS: Lang[] = ["fr", "en", "es"];
export const DEFAULT_LANG: Lang = "fr";

export const LANG_LABELS: Record<Lang, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
};

const STORAGE_KEY = "fr-lang";
const PICKER_DISMISSED_KEY = "fr-lang-picker-dismissed";

// `fr` is the canonical, fully-populated dictionary. EN/ES may have missing
// keys (we fall back to FR at lookup time), and `as const` would otherwise
// make TS reject the structural cast because each literal differs.
type Dict = typeof fr;
const DICTS: Record<Lang, Dict> = {
  fr,
  en: en as unknown as Dict,
  es: es as unknown as Dict,
};

// Internal state — initialized lazily so SSR-style imports don't crash.
let currentLang: Lang = DEFAULT_LANG;
let initialized = false;
let pickerNeeded = false;
const listeners = new Set<(l: Lang) => void>();

function detectBrowserLang(): Lang | null {
  if (typeof navigator === "undefined") return null;
  const candidates: string[] = [];
  if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
  if (navigator.language) candidates.push(navigator.language);
  for (const raw of candidates) {
    const code = raw.toLowerCase().split("-")[0];
    if ((SUPPORTED_LANGS as string[]).includes(code)) return code as Lang;
  }
  return null;
}

function init() {
  if (initialized) return;
  initialized = true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (SUPPORTED_LANGS as string[]).includes(saved)) {
      currentLang = saved as Lang;
      return;
    }
  } catch { /* noop */ }
  const detected = detectBrowserLang();
  if (detected) {
    currentLang = detected;
    return;
  }
  // Unknown browser locale → show the picker on first render so the user can
  // pick explicitly. We still default to French behind the modal.
  currentLang = DEFAULT_LANG;
  try {
    if (!localStorage.getItem(PICKER_DISMISSED_KEY)) pickerNeeded = true;
  } catch {
    pickerNeeded = true;
  }
}

export function getLang(): Lang { init(); return currentLang; }

export function setLang(next: Lang, opts: { remember?: boolean } = {}) {
  init();
  if (!(SUPPORTED_LANGS as string[]).includes(next)) return;
  currentLang = next;
  const remember = opts.remember ?? true;
  if (remember) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
      localStorage.setItem(PICKER_DISMISSED_KEY, "1");
    } catch { /* noop */ }
  }
  pickerNeeded = false;
  listeners.forEach((l) => l(next));
}

export function needsLanguagePicker(): boolean { init(); return pickerNeeded; }

export function dismissLanguagePicker() {
  pickerNeeded = false;
  try { localStorage.setItem(PICKER_DISMISSED_KEY, "1"); } catch { /* noop */ }
}

export function subscribeLang(cb: (l: Lang) => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function lookup(dict: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

export function translate(key: string, vars?: Record<string, string | number>): string {
  init();
  let str = lookup(DICTS[currentLang], key) ?? lookup(DICTS[DEFAULT_LANG], key) ?? key;
  if (vars) {
    str = str.replace(/\{(\w+)\}/g, (_m, k: string) => {
      const v = vars[k];
      return v === undefined || v === null ? "" : String(v);
    });
  }
  return str;
}
