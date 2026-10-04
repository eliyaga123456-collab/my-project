const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

/** Strip invisible / bidi characters and compatibility forms (fullwidth, ligatures...). */
export function cleanText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F­​-‏‪-‮⁠-⁩﻿]/g, "")
    .replace(/[֑-ׇ]/g, "") // Hebrew niqqud / cantillation
    .replace(/[̀-ͯ]/g, "") // combining marks (after NFD below)
    ;
}

/** Lower-case, de-accent, fold look-alike digits/symbols, collapse repeats. Used for matching only. */
export function foldForMatching(input: string): string {
  let s = cleanText(input).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  // Cyrillic / Greek look-alikes of latin letters
  s = s.replace(/[а]/g, "a").replace(/[е]/g, "e").replace(/[о]/g, "o").replace(/[р]/g, "p").replace(/[с]/g, "c").replace(/[х]/g, "x").replace(/[у]/g, "y").replace(/[ι]/g, "i").replace(/[ο]/g, "o");
  // only fold digits/symbols that are glued to letters ("k1ll", "@ss"), never standalone numbers or punctuation
  s = s.replace(/(?<=[a-z])[013457@$](?=[a-z013457@$]|\b)|(?<![a-z0-9])[013457@$](?=[a-z])/g, (c) => LEET[c] ?? c);
  // join "k i l l" / "k.i.l.l" / "k-i-l-l" style single-letter spacing
  s = s.replace(/\b(?:[a-z][\s.\-_*]){2,}[a-z]\b/g, (m) => m.replace(/[\s.\-_*]/g, ""));
  // collapse 3+ repeated letters to 2 ("killlll" -> "kill")
  s = s.replace(/([a-zא-ת])\1{2,}/g, "$1$1");
  return s.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

/** Digits-preserving variant for numeric PII detection (leet folding would corrupt numbers). */
export const digitsOnly = (s: string) => cleanText(s).replace(/\D/g, "");
