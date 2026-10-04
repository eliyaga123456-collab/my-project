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
  cachedToken = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}
export async function clearToken(): Promise<void> {
  cachedToken = null;
  try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch { /* keystore unavailable */ }
}
export function setUnauthorizedHandler(fn: (() => void) | null) { unauthorizedHandler = fn; }

export const api = createApiClient({
  baseUrl: API_URL,
  clientKind: "mobile",
  credentials: "omit",
  getToken: async () => (cachedToken === undefined ? loadToken() : cachedToken),
  onUnauthorized: () => unauthorizedHandler?.()
});
