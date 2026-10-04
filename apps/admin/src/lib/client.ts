import { createApiClient, ApiError } from "@unsaid/api-client";

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) { unauthorizedHandler = fn; }

export const client = createApiClient({
  baseUrl: "",
  clientKind: "admin",
  credentials: "same-origin",
  onUnauthorized: () => unauthorizedHandler?.()
});

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.friendly;
  return e instanceof Error ? e.message : "Something went wrong.";
}
export { ApiError };
