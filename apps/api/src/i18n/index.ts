import type { FastifyRequest } from "fastify";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@unsaid/shared";
import { HE_EXACT, HE_PATTERNS } from "./he";

export type Lang = Locale;

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Language for this request: `x-lang` header first, then Accept-Language, else English. */
export function langOf(req: Pick<FastifyRequest, "headers">): Lang {
  const x = req.headers["x-lang"];
  const explicit = Array.isArray(x) ? x[0] : x;
  if (isLocale(explicit)) return explicit;
  const al = String(req.headers["accept-language"] ?? "").toLowerCase();
  const first = al.split(",")[0]?.trim() ?? "";
  if (first.startsWith("he") || first.startsWith("iw")) return "he";
  return DEFAULT_LOCALE;
}

/** Translate a server message. Unknown strings fall back to the original English. */
export function tr(lang: Lang, text: string): string {
  if (lang === "en") return text;
  const exact = HE_EXACT[text];
  if (exact) return exact;
  for (const [re, f] of HE_PATTERNS) {
    const m = text.match(re);
    if (m) return f(m);
  }
  return text;
}
