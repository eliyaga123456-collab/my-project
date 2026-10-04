import type { Dictionary } from "./dictionaries";
import type { Locale } from "./config";
import type { Leaves, PluralBase } from "./types";

export type Key = Leaves<Dictionary>;
export type PluralKey = PluralBase<Key>;
export type Params = Record<string, string | number>;

function lookup(dict: Dictionary, key: string): string {
  let cur: unknown = dict;
  for (const part of key.split(".")) cur = (cur as Record<string, unknown> | undefined)?.[part];
  return typeof cur === "string" ? cur : key; // a missing key shows itself instead of crashing
}
const fill = (s: string, p?: Params) => (p ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in p ? String(p[k]) : m)) : s);

export interface Translator {
  locale: Locale;
  t: (key: Key, params?: Params) => string;
  /** Plural-aware: uses `${base}_one|_two|_other` according to Intl.PluralRules for the locale. `{count}` is filled in. */
  tp: (base: PluralKey, count: number, params?: Params) => string;
}

export function createTranslator(locale: Locale, dict: Dictionary): Translator {
  const rules = new Intl.PluralRules(locale);
  return {
    locale,
    t: (key, params) => fill(lookup(dict, key), params),
    tp: (base, count, params) => {
      const cat = rules.select(count);
      const k = `${base}_${cat}`;
      const s = lookup(dict, k) === k ? lookup(dict, `${base}_other`) : lookup(dict, k);
      return fill(s, { count: new Intl.NumberFormat(locale).format(count), ...params });
    }
  };
}
