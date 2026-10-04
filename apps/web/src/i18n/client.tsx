"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { dirOf, type Locale } from "./config";
import { dictionaries } from "./dictionaries";
import { createTranslator, type Translator } from "./translate";

type Ctx = Translator & { dir: "ltr" | "rtl"; isRTL: boolean };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<Ctx>(() => ({ ...createTranslator(locale, dictionaries[locale]), dir: dirOf(locale), isRTL: dirOf(locale) === "rtl" }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Client-side translator: `const { t, tp, locale, dir } = useT();` */
export function useT(): Ctx {
  const v = useContext(I18nContext);
  if (!v) throw new Error("useT must be used inside <I18nProvider>");
  return v;
}
