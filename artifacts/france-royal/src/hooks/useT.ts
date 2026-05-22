import { useEffect, useState, useCallback } from "react";
import { getLang, setLang, subscribeLang, translate, type Lang } from "../lib/i18n";

export function useT() {
  const [lang, setLangState] = useState<Lang>(() => getLang());
  useEffect(() => subscribeLang(setLangState), []);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(key, vars),
    // `lang` is part of the dep array so consumers re-render when the language
    // changes (the value of `t` itself is unchanged but React diffs by reference).
    [lang],
  );
  return { t, lang, setLang };
}
