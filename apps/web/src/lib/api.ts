import { createApiClient } from "@unsaid/api-client";

/** Browser client: same-origin via the Next rewrite, cookie auth (httpOnly, set by the API). */
export const api = createApiClient({
  baseUrl: "",
  clientKind: "web",
  credentials: "same-origin",
  getLang: () => (typeof document === "undefined" ? undefined : document.documentElement.lang || undefined),
  onUnauthorized: () => {}
});
