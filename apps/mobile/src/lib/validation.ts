import { LIMITS, emailSchema, messageBodySchema, passwordSchema, usernameSchema } from "@unsaid/shared";
import type { ApiError } from "@unsaid/api-client";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function first(r: { success: boolean; error?: { issues: { message: string }[] } }): string {
  return r.error?.issues[0]?.message ?? "Invalid value";
}

export function validateEmail(v: string): Result<string> {
  const r = emailSchema.safeParse(v);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: "Enter a valid email address" };
}

export function validateUsername(v: string): Result<string> {
  const r = usernameSchema.safeParse(v);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: first(r) };
}

export function validatePassword(v: string): Result<string> {
  const r = passwordSchema.safeParse(v);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: first(r) };
}

export function validateMessage(v: string): Result<string> {
  const r = messageBodySchema.safeParse(v);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: first(r) };
}

export interface PasswordRule { id: string; label: string; met: boolean }
export function passwordRules(pw: string): PasswordRule[] {
  return [
    { id: "len", label: `At least ${LIMITS.passwordMin} characters`, met: pw.length >= LIMITS.passwordMin },
    { id: "mix", label: "A letter and a number", met: /[A-Za-z]/.test(pw) && /\d/.test(pw) },
    { id: "max", label: `At most ${LIMITS.passwordMax} characters`, met: pw.length > 0 && pw.length <= LIMITS.passwordMax }
  ];
}

/** Flattens server `details` ({field: [messages]}) to a field -> first message map. */
export function fieldErrors(err: Pick<ApiError, "details">): Record<string, string> {
  const out: Record<string, string> = {};
  const d = err.details as Record<string, unknown> | undefined;
  if (!d) return out;
  for (const [k, v] of Object.entries(d)) {
    if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0];
  }
  return out;
}
