import { createApiClient } from "@unsaid/api-client";

const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

/** Browser client: same-origin via the Next rewrite, cookie auth (httpOnly, set by the API). */
export const api = createApiClient({
  baseUrl: "",
  clientKind: "web",
  credentials: "same-origin",
  onUnauthorized: () => {
    if (typeof window === "undefined") return;
    const p = window.location.pathname;
    const appRoute = ["/inbox", "/links", "/share", "/notifications", "/settings", "/analytics"].some((r) => p === r || p.startsWith(`${r}/`));
    if (appRoute && !AUTH_PAGES.includes(p)) window.location.assign("/login");
  }
});
