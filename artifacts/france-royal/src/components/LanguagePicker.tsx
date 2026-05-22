import { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import {
  SUPPORTED_LANGS,
  LANG_LABELS,
  getLang,
  setLang,
  needsLanguagePicker,
  type Lang,
} from "../lib/i18n";

// Bilingual prompts so even users on an unsupported locale (e.g. zh/ja) can
// understand the picker. Shown only on first launch when the browser language
// is not one of SUPPORTED_LANGS.
const BILINGUAL_TITLE = "Choose your language · Choisis ta langue · Elige tu idioma";

export default function LanguagePicker() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Trigger detection + decide whether to show the modal on mount.
    if (needsLanguagePicker()) setOpen(true);
  }, []);

  if (!open) return null;

  const pick = (l: Lang) => {
    setLang(l, { remember: true });
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-[0_10px_0_rgba(0,0,0,0.4)] space-y-4">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center shadow-[0_4px_0_rgba(0,0,0,0.4)]">
            <Globe className="w-7 h-7 text-white" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-300 font-bold">
            {BILINGUAL_TITLE}
          </div>
        </div>
        <div className="space-y-2 pt-1">
          {SUPPORTED_LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => pick(l)}
              data-testid={`button-lang-${l}`}
              className={`w-full h-12 rounded-xl border font-black text-base flex items-center justify-between px-4 transition active:translate-y-px ${
                getLang() === l
                  ? "bg-blue-600 border-blue-400 text-white shadow-[0_4px_0_rgba(0,0,0,0.4)]"
                  : "bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700 shadow-[0_3px_0_rgba(0,0,0,0.4)]"
              }`}
            >
              <span className="uppercase tracking-widest text-xs opacity-70">{l}</span>
              <span>{LANG_LABELS[l]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
