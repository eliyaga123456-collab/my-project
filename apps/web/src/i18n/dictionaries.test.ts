import { describe, expect, it } from "vitest";
import { dictionaries } from "./dictionaries";
import { createTranslator } from "./translate";

function flatten(o: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}
// `{count}` may be legitimately omitted in plural forms ("a minute", "דקה").
const params = (s: string) => Array.from(s.matchAll(/\{(\w+)\}/g), (m) => m[1]!).filter((p) => p !== "count").sort();
const tags = (s: string) => Array.from(s.matchAll(/<(\w+)>/g), (m) => m[1]!).sort();

const en = flatten(dictionaries.en);
const he = flatten(dictionaries.he);

describe("dictionaries", () => {
  it("en and he have identical key sets", () => {
    expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort());
  });
  it("no empty strings", () => {
    for (const [k, v] of [...Object.entries(en), ...Object.entries(he)]) expect(v.trim(), k).not.toBe("");
  });
  it("placeholders and inline tags match between languages", () => {
    for (const k of Object.keys(en)) {
      expect(params(he[k]!), `params of ${k}`).toEqual(params(en[k]!));
      expect(tags(he[k]!), `tags of ${k}`).toEqual(tags(en[k]!));
    }
  });
  it("plural groups always define _other", () => {
    for (const dict of [en, he]) {
      for (const k of Object.keys(dict)) {
        const m = k.match(/^(.*)_(one|two)$/);
        if (m) expect(dict[`${m[1]}_other`], `${m[1]}_other`).toBeDefined();
      }
    }
  });
  it("Hebrew plurals resolve", () => {
    const tr = createTranslator("he", dictionaries.he);
    expect(tr.tp("public.errors.minutes", 1)).toBe("דקה");
    expect(tr.tp("public.errors.minutes", 2)).toBe("שתי דקות");
    expect(tr.tp("public.errors.minutes", 7)).toBe("7 דקות");
    expect(createTranslator("en", dictionaries.en).tp("public.errors.minutes", 7)).toBe("7 minutes");
  });
});
