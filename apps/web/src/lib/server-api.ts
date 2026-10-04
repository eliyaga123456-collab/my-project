import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createApiClient, ApiError } from "@unsaid/api-client";
import type { MeDto } from "@unsaid/shared";
import { API_URL } from "./site";

const noStore: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });

/** Anonymous server-side client (public pages). */
export const publicApi = createApiClient({ baseUrl: API_URL, clientKind: "web", fetchImpl: noStore });

/** Server-side client that forwards the visitor's session cookie. */
export async function serverApi() {
  const cookie = (await cookies()).toString();
  return createApiClient({
    baseUrl: API_URL,
    clientKind: "web",
    fetchImpl: noStore,
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
