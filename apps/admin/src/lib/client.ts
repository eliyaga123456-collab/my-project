import { createApiClient, ApiError } from "@unsaid/api-client";
import { DICTS, getCurrentLocale, translateWith } from "../i18n";

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) { unauthorizedHandler = fn; }

export const client = createApiClient({
  baseUrl: "",
  clientKind: "admin",
  credentials: "same-origin",
  getLang: () => getCurrentLocale(),
  onUnauthorized: () => unauthorizedHandler?.()
});

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const loc = getCurrentLocale();
    if (loc === "en") return e.friendly;
    // ApiError.friendly is English-only; the API already answers in the requested language, so prefer its message.
    if (e.code === "network_error") return translateWith(DICTS, loc, "error.network");
    if (e.code === "rate_limited") return e.retryAfterSeconds ? translateWith(DICTS, loc, "error.rateLimited", { seconds: e.retryAfterSeconds }) : translateWith(DICTS, loc, "error.rateLimitedGeneric");
    return e.message || e.friendly;
  }
  return e instanceof Error ? e.message : translateWith(DICTS, getCurrentLocale(), "common.somethingWrong");
}
export { ApiError };
