import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createApiClient, ApiError } from "@unsaid/api-client";
import type { MeDto } from "@unsaid/shared";
import { API_URL } from "./site";
import { getLocale } from "@/i18n/server";

const noStore: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });

/** Anonymous server-side client (public pages). */
export async function getPublicApi() {
  const lang = await getLocale();
  return createApiClient({ baseUrl: API_URL, clientKind: "web", fetchImpl: noStore, getLang: () => lang });
}
/** @deprecated prefer getPublicApi() so API errors come back in the visitor's language. */
export const publicApi = createApiClient({ baseUrl: API_URL, clientKind: "web", fetchImpl: noStore });

/** Server-side client that forwards the visitor's session cookie. */
export async function serverApi() {
  const cookie = (await cookies()).toString();
  const lang = await getLocale();
  return createApiClient({
    baseUrl: API_URL,
    clientKind: "web",
    fetchImpl: noStore,
    getLang: () => lang,
    getHeaders: (): Record<string, string> => (cookie ? { cookie } : {})
  });
}

export const getMe = cache(async (): Promise<MeDto | null> => {
  try {
    return await (await serverApi()).auth.me();
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.code === "unauthorized")) return null;
    throw e;
  }
});
