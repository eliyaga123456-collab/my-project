import { ApiError } from "@unsaid/api-client";
import { translate } from "../i18n/core";

/**
 * User-facing text for any error. The API already answers in the user's language (x-lang), so its own message is shown as-is;
 * only the client-generated cases (no network, bare status codes) are translated here instead of using ApiError.friendly (English only).
 */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "network_error": return translate("errors.network");
      case "rate_limited": return e.retryAfterSeconds ? translate("errors.rateLimitedIn", { seconds: e.retryAfterSeconds }) : e.message || translate("errors.rateLimited");
      case "unauthorized": return translate("errors.unauthorized");
      case "forbidden": return e.message || translate("errors.forbidden");
      case "not_found": return translate("errors.notFound");
      case "server_error": return translate("errors.server");
      default: return e.message || translate("errors.generic");
    }
  }
  return e instanceof Error && e.message ? e.message : translate("errors.generic");
}
export const isNetworkError = (e: unknown) => e instanceof ApiError && e.code === "network_error";

/** Errors that say nothing about the session itself (offline, cold-starting server, 5xx, rate limit): the saved token must be kept. */
export const isTransient = (e: unknown): boolean => !(e instanceof ApiError) || e.code === "network_error" || e.status === 0 || e.status >= 500 || e.status === 429;
