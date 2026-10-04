import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, dirOf, isLocale, localeFromAcceptLanguage, type Locale } from "./config";
import { dictionaries } from "./dictionaries";
import { createTranslator } from "./translate";

/** Locale for this request: the `ear-locale` cookie, else the browser's Accept-Language, else English. */
export const getLocale = cache(async (): Promise<Locale> => {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
});

/** Server-side translator: `const { t, tp, locale } = await getT();` */
export async function getT() {
  const locale = await getLocale();
  return { ...createTranslator(locale, dictionaries[locale]), dir: dirOf(locale) };
}
