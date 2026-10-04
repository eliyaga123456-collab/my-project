import { LIMITS } from "@unsaid/shared";

export interface PasswordRule { id: string; label: string; ok: boolean }

export function passwordRules(pw: string): PasswordRule[] {
  return [
    { id: "len", label: `At least ${LIMITS.passwordMin} characters`, ok: pw.length >= LIMITS.passwordMin },
    { id: "max", label: `At most ${LIMITS.passwordMax} characters`, ok: pw.length <= LIMITS.passwordMax },
    { id: "mix", label: "Mix of letters and numbers or symbols (recommended)", ok: /[a-zA-Z]/.test(pw) && /[^a-zA-Z]/.test(pw) }
  ];
}

/** The API only enforces length; the mix rule is advice. */
export function passwordAcceptable(pw: string): boolean {
  return pw.length >= LIMITS.passwordMin && pw.length <= LIMITS.passwordMax;
}
