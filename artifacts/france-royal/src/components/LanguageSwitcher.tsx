import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGS, LANG_LABELS, type Lang } from "../lib/i18n";
import { useT } from "../hooks/useT";

// Compact dropdown shown next to LogoutButton. Toggles between supported
// languages and persists the choice via setLang().
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 font-black text-xs uppercase tracking-wider shadow-[0_3px_0_rgba(0,0,0,0.4)] hover:bg-slate-700 active:translate-y-px"
        aria-label={t("language.label")}
        data-testid="button-language"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{lang.toUpperCase()}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-50 w-40 rounded-xl bg-slate-900 border border-slate-700 shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden">
          {SUPPORTED_LANGS.map((l: Lang) => (
            <button
              key={l}
              type="button"
              onClick={() => { setLang(l); setOpen(false); }}
              data-testid={`menu-lang-${l}`}
              className={`w-full text-left px-3 py-2 text-sm font-bold flex items-center justify-between gap-2 hover:bg-slate-800 ${
                lang === l ? "bg-slate-800 text-blue-300" : "text-slate-200"
              }`}
            >
              <span className="text-[10px] uppercase tracking-widest opacity-70">{l}</span>
              <span>{LANG_LABELS[l]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
