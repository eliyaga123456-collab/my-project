import { ApiError } from "@unsaid/api-client";
import { dictionaries } from "@/i18n/dictionaries";
import { createTranslator, type Translator } from "@/i18n/translate";

type Tr = Pick<Translator, "t" | "tp">;
/** Default translator (English) so callers without a locale, and unit tests, keep working. */
const EN: Tr = createTranslator("en", dictionaries.en);

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Maps API validation `details` ({field: [msgs]}) to the first message per field. */
export function fieldErrors(e: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isApiError(e) || !e.details || typeof e.details !== "object") return out;
  for (const [k, v] of Object.entries(e.details as Record<string, unknown>)) {
    if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0];
    else if (typeof v === "string") out[k] = v;
  }
  return out;
}

export function errorMessage(e: unknown, fallback: string = EN.t("public.errors.generic")): string {
  if (isApiError(e)) return e.friendly || fallback;
  return fallback;
}

export type SendFailure =
  | { kind: "paused" }
  | { kind: "not_found" }
  | { kind: "rate_limited"; message: string }
  | { kind: "rejected"; message: string }
  | { kind: "error"; message: string };

/** Friendly classification of a failed anonymous send. Pass the active translator to get localized fallbacks. */
export function classifySendError(e: unknown, tr: Tr = EN): SendFailure {
  const { t } = tr;
  if (!isApiError(e)) return { kind: "error", message: t("public.errors.generic") };
  switch (e.code) {
    case "link_paused": return { kind: "paused" };
    case "not_found": return { kind: "not_found" };
    case "rate_limited":
      return { kind: "rate_limited", message: e.retryAfterSeconds ? t("public.errors.rateLimitedWait", { wait: formatWait(e.retryAfterSeconds, tr) }) : t("public.errors.rateLimited") };
    case "moderation_rejected":
      return { kind: "rejected", message: e.message && e.message !== "Unprocessable Entity" ? e.message : t("public.errors.rejected") };
    case "account_suspended": return { kind: "paused" };
    case "validation_error": return { kind: "error", message: firstDetail(e) ?? e.message ?? t("public.errors.check") };
    default: return { kind: "error", message: e.friendly };
  }
}

function firstDetail(e: ApiError): string | undefined {
  return Object.values(fieldErrors(e))[0];
}

export function formatWait(seconds: number, tr: Tr = EN): string {
  if (seconds < 60) return tr.tp("public.errors.seconds", Math.max(1, Math.ceil(seconds)));
  return tr.tp("public.errors.minutes", Math.ceil(seconds / 60));
}
