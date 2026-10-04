import * as SecureStore from "expo-secure-store";
import { createApiClient } from "@unsaid/api-client";
import { API_URL } from "./env";

const TOKEN_KEY = "unsaid.session";
let cachedToken: string | null | undefined;
let unauthorizedHandler: (() => void) | null = null;

export async function loadToken(): Promise<string | null> {
  try {
    cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    cachedToken = null;
  }
  return cachedToken ?? null;
}
export async function saveToken(token: string): Promise<void> {
  cachedToken = token; // the in-memory copy keeps this session working even when the keystore is unavailable
  try { await SecureStore.setItemAsync(TOKEN_KEY, token); } catch { /* keystore unavailable: signed in until the app closes */ }
}
export async function clearToken(): Promise<void> {
  cachedToken = null;
  try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch { /* keystore unavailable */ }
}
let currentLang: string = "en";
/** The UI language sent as `x-lang`, so the API answers errors (moderation, validation, paused rounds) in it. */
export function setApiLang(lang: string) { currentLang = lang; }
export function setUnauthorizedHandler(fn: (() => void) | null) { unauthorizedHandler = fn; }

/** Render's free tier needs up to ~60 s to wake: wait long enough for that, but never hang forever (RN fetch has no default timeout). */
export const REQUEST_TIMEOUT_MS = 45_000;
export function fetchWithTimeout(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1], ms = REQUEST_TIMEOUT_MS): Promise<Response> {
  if (typeof AbortController === "undefined") return fetch(input, init);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  return fetch(input, { ...init, signal: ctl.signal }).finally(() => clearTimeout(timer));
}

export const api = createApiClient({
  fetchImpl: (input, init) => fetchWithTimeout(input, init),
  baseUrl: API_URL,
  clientKind: "mobile",
  credentials: "omit",
  getLang: () => currentLang,
  getToken: async () => (cachedToken === undefined ? loadToken() : cachedToken),
  onUnauthorized: () => unauthorizedHandler?.()
});
