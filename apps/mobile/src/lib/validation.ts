import { LIMITS, emailSchema, messageBodySchema, passwordSchema, usernameSchema } from "@unsaid/shared";
import type { ApiError } from "@unsaid/api-client";
import { translate } from "../i18n/core";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

type Issue = { code?: string; message: string };
const issue = (r: { success: boolean; error?: { issues: Issue[] } }): Issue | undefined => r.error?.issues[0];

/** Localised message for the first zod issue (the shared schemas' own messages are English). */
function usernameError(i: Issue | undefined): string {
  if (!i) return translate("validation.invalid");
  if (i.code === "too_small") return translate("validation.username.min", { min: LIMITS.usernameMin });
  if (i.code === "too_big") return translate("validation.username.max", { max: LIMITS.usernameMax });
  if (i.code === "custom") return translate("validation.username.unavailable");
  return translate("validation.username.chars");
}
function passwordError(i: Issue | undefined): string {
  if (!i) return translate("validation.invalid");
  return i.code === "too_big" ? translate("validation.password.max", { max: LIMITS.passwordMax }) : translate("validation.password.min", { min: LIMITS.passwordMin });
}
function messageError(i: Issue | undefined): string {
  if (!i) return translate("validation.invalid");
  return i.code === "too_big" ? translate("validation.message.max", { max: LIMITS.messageMax }) : translate("validation.message.min");
}

export function validateEmail(v: string): Result<string> {
  const r = emailSchema.safeParse(v);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: translate("validation.email") };
}

export function validateUsername(v: string): Result<string> {
  const r = usernameSchema.safeParse(v);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: usernameError(issue(r)) };
}

export function validatePassword(v: string): Result<string> {
  const r = passwordSchema.safeParse(v);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: passwordError(issue(r)) };
}

export function validateMessage(v: string): Result<string> {
  const r = messageBodySchema.safeParse(v);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: messageError(issue(r)) };
}

export interface PasswordRule { id: "len" | "mix" | "max"; label: string; met: boolean }
export function passwordRules(pw: string): PasswordRule[] {
  return [
    { id: "len", label: translate("password.rule.len", { min: LIMITS.passwordMin }), met: pw.length >= LIMITS.passwordMin },
    { id: "mix", label: translate("password.rule.mix"), met: /[A-Za-z]/.test(pw) && /\d/.test(pw) },
    { id: "max", label: translate("password.rule.max", { max: LIMITS.passwordMax }), met: pw.length > 0 && pw.length <= LIMITS.passwordMax }
  ];
}

/** Flattens server `details` ({field: [messages]}) to a field -> first message map. Messages are already localised by the API. */
export function fieldErrors(err: Pick<ApiError, "details">): Record<string, string> {
  const out: Record<string, string> = {};
  const d = err.details as Record<string, unknown> | undefined;
  if (!d) return out;
  for (const [k, v] of Object.entries(d)) {
    if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0];
  }
  return out;
}
