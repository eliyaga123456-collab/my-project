import { ApiError } from "@unsaid/api-client";

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.friendly;
  return e instanceof Error ? e.message : "Something went wrong.";
}
export const isNetworkError = (e: unknown) => e instanceof ApiError && e.code === "network_error";
