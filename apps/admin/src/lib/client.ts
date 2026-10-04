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
  if (e instanceof ApiError) return e.friendly;
  return e instanceof Error ? e.message : translateWith(DICTS, getCurrentLocale(), "common.somethingWrong");
}
export { ApiError };
