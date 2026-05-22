import { useEffect, useState, useCallback } from "react";
import { getLang, setLang, subscribeLang, translate, type Lang } from "../lib/i18n";
import type { CardDef } from "../game/types";

export function useT() {
  const [lang, setLangState] = useState<Lang>(() => getLang());
  useEffect(() => subscribeLang(setLangState), []);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(key, vars),
    // `lang` is part of the dep array so consumers re-render when the language
    // changes (the value of `t` itself is unchanged but React diffs by reference).
    [lang],
  );
  // Translate a card's localizable text field (`name` subtitle, `powerName`,
  // `powerDesc`). Falls back to the canonical FR value baked into cards.ts when
  // no translation exists for the current language. `fullName` stays untranslated
  // (proper nouns of real political personalities).
  const ct = useCallback(
    (card: CardDef, field: "name" | "powerName" | "powerDesc"): string => {
      const key = `cards.${card.id}.${field}`;
      const v = translate(key);
      return v === key ? card[field] : v;
    },
    [lang],
  );
  return { t, ct, lang, setLang };
}
