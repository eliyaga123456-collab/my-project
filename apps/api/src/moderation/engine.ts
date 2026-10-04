import type { ModerationCategory } from "@unsaid/shared";
import { digitsOnly, foldForMatching } from "./normalize";
import { NEGATION, RULES, structuralSignals } from "./rules";

export type Decision = "allow" | "hold" | "reject";
export interface ModerationResult {
  decision: Decision;
  categories: ModerationCategory[];
  score: number;
  reasons: string[];
}
export interface ModerationOptions {
  enhanced?: boolean;
  hiddenWords?: string[];
}

export const THRESHOLDS = {
  standard: { hold: 50, reject: 100 },
  enhanced: { hold: 30, reject: 70 }
} as const;

function luhn(num: string): boolean {
  let sum = 0, alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = Number(num[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

/** Numeric PII: phone-like sequences, card numbers, Israeli ID-like numbers near cue words. */
function numericSignals(raw: string): { category: ModerationCategory; weight: number; reason: string }[] {
  const out: { category: ModerationCategory; weight: number; reason: string }[] = [];
  const digits = digitsOnly(raw);
  const run = raw.match(/(?:\+?\d[\s().\-]*){7,}/g) ?? [];
  for (const r of run) {
    const d = r.replace(/\D/g, "");
    if (d.length >= 13 && d.length <= 19 && luhn(d)) { out.push({ category: "personal_info", weight: 100, reason: "payment card number" }); continue; }
    if (d.length >= 9 && d.length <= 15) out.push({ category: "personal_info", weight: 60, reason: "phone number" });
  }
  if (!run.length && digits.length >= 13 && digits.length <= 19 && luhn(digits) && /\d{4}[\s-]?\d{4}/.test(raw)) {
    out.push({ category: "personal_info", weight: 100, reason: "payment card number" });
  }
  return out;
}

/**
 * Layered rule-based moderation. Deterministic and explainable by design — the decision is a function of
 * (text, recipient settings). `hold` messages go to the recipient's Filtered folder, `reject` are refused.
 */
export function moderate(text: string, opts: ModerationOptions = {}): ModerationResult {
  const folded = foldForMatching(text);
  const th = opts.enhanced ? THRESHOLDS.enhanced : THRESHOLDS.standard;
  const hits = new Map<ModerationCategory, number>();
  const reasons: string[] = [];
  const add = (category: ModerationCategory, weight: number, reason: string) => {
    hits.set(category, Math.max(hits.get(category) ?? 0, weight));
    reasons.push(`${category}:${reason}`);
  };

  for (const rule of RULES) {
    // Match on folded text; spam/link/email/phone rules need the raw lower-cased text too (folding strips punctuation).
    const sources = rule.category === "spam" || rule.category === "personal_info" || /[\u0590-\u05FF]/.test(rule.pattern.source) ? [folded, text.toLowerCase().normalize("NFKC")] : [folded];
    for (const src of sources) {
      const m = src.match(rule.pattern);
      if (!m || m.index === undefined) continue;
      if (rule.negatable && NEGATION.test(src.slice(0, m.index))) continue;
      add(rule.category, rule.weight, rule.reason);
      break;
    }
  }
  for (const s of structuralSignals(text)) add(s.category, s.weight, s.reason);
  for (const s of numericSignals(text)) add(s.category, s.weight, s.reason);

  // Multiple links = reject-level spam.
  const links = text.match(/(?:https?:\/\/|www\.)\S+/gi) ?? [];
  if (links.length >= 3) add("spam", 100, "many links");

  // Recipient-defined hidden words (matched on folded text with word boundaries; folded words must also be folded).
  for (const w of opts.hiddenWords ?? []) {
    const fw = foldForMatching(w);
    if (!fw) continue;
    const esc = fw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?:^|\\s)${esc}(?:\\s|$)`, "u").test(folded) || (fw.length >= 4 && folded.includes(fw))) {
      add("hidden_word", th.hold, "hidden word");
      break;
    }
  }

  // Combine: highest category weight, plus a small bonus for multiple distinct categories (bounded).
  const weights = [...hits.values()].sort((a, b) => b - a);
  const score = weights.length ? Math.min(150, weights[0]! + (weights.length - 1) * 10) : 0;
  const categories = [...hits.keys()];
  const decision: Decision = score >= th.reject ? "reject" : score >= th.hold ? "hold" : "allow";
  // Hidden words never hard-reject: they quietly filter.
  const onlyHidden = categories.length === 1 && categories[0] === "hidden_word";
  return { decision: onlyHidden && decision === "reject" ? "hold" : decision, categories, score, reasons };
}
