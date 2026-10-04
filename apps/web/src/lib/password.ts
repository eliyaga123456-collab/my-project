import { LIMITS } from "@unsaid/shared";

/** Labels are localized by the caller from `id` (auth.password.rule*). */
export interface PasswordRule { id: "len" | "max" | "mix"; ok: boolean }

export function passwordRules(pw: string): PasswordRule[] {
  return [
    { id: "len", ok: pw.length >= LIMITS.passwordMin },
    { id: "max", ok: pw.length <= LIMITS.passwordMax },
    { id: "mix", ok: /\p{L}/u.test(pw) && /[^\p{L}]/u.test(pw) }
  ];
}

/** The API only enforces length; the mix rule is advice. */
export function passwordAcceptable(pw: string): boolean {
  return pw.length >= LIMITS.passwordMin && pw.length <= LIMITS.passwordMax;
}
