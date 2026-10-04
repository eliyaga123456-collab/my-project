import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { ApiError } from "@unsaid/api-client";
import { getPublicApi } from "./server-api";

function handle(e: unknown): never {
  if (e instanceof ApiError && (e.status === 404 || e.code === "not_found")) notFound();
  throw e;
}

// React cache() dedupes between generateMetadata and the page so a visit counts as one view.
export const getProfile = cache(async (username: string) => {
  try { return await (await getPublicApi()).profile.get(username); } catch (e) { return handle(e); }
});
export const getLinkProfile = cache(async (slug: string) => {
  try { return await (await getPublicApi()).profile.getByLink(slug); } catch (e) { return handle(e); }
});
export const getAnswers = cache(async (username: string) => {
  try { return await (await getPublicApi()).profile.answers(username); } catch { return { items: [], nextCursor: null }; }
});
export const getAnswer = cache(async (id: string) => {
  try { return await (await getPublicApi()).answers.get(id); } catch (e) { return handle(e); }
});
