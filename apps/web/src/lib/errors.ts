import { ApiError } from "@unsaid/api-client";

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

export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (isApiError(e)) return e.friendly || fallback;
  return fallback;
}

export type SendFailure =
  | { kind: "paused" }
  | { kind: "not_found" }
  | { kind: "rate_limited"; message: string }
  | { kind: "rejected"; message: string }
  | { kind: "error"; message: string };

/** Friendly classification of a failed anonymous send. */
export function classifySendError(e: unknown): SendFailure {
  if (!isApiError(e)) return { kind: "error", message: "Something went wrong. Please try again." };
  switch (e.code) {
    case "link_paused": return { kind: "paused" };
    case "not_found": return { kind: "not_found" };
    case "rate_limited":
      return { kind: "rate_limited", message: e.retryAfterSeconds ? `You're sending a lot of messages. Take a breather and try again in about ${formatWait(e.retryAfterSeconds)}.` : "You're sending a lot of messages. Take a breather and try again in a little while." };
    case "moderation_rejected":
      return { kind: "rejected", message: e.message && e.message !== "Unprocessable Entity" ? e.message : "That one didn't go through. Try rewording it kindly." };
    case "account_suspended": return { kind: "paused" };
    case "validation_error": return { kind: "error", message: firstDetail(e) ?? e.message ?? "Please check your message and try again." };
    default: return { kind: "error", message: e.friendly };
  }
}

function firstDetail(e: ApiError): string | undefined {
  return Object.values(fieldErrors(e))[0];
}

export function formatWait(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))} seconds`;
  const m = Math.ceil(seconds / 60);
  return m === 1 ? "a minute" : `${m} minutes`;
}
