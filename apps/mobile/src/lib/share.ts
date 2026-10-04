import { stripIsolates, translate } from "../i18n/core";

/** Pure builders and guarded wrappers for every share / copy flow (no React Native imports: unit-testable under node). */

const trim = (u: string) => u.replace(/\/+$/, "");

/** Public URL of a round or the always-on link, built from the app's own WEB_URL (never trusts the server's host config). */
export function linkUrl(webUrl: string, link: { isPrimary: boolean; slug: string; url?: string }, username: string | undefined): string {
  if (link.isPrimary && username) return `${trim(webUrl)}/u/${encodeURIComponent(username)}`;
  if (!link.isPrimary && link.slug) return `${trim(webUrl)}/l/${encodeURIComponent(link.slug)}`;
  return link.url ?? trim(webUrl);
}

export const installUrl = (webUrl: string) => `${trim(webUrl)}/install`;
export const answerUrl = (webUrl: string, answerId: string) => `${trim(webUrl)}/a/${encodeURIComponent(answerId)}`;

/** Localized text handed to the system share sheet (no bidi isolate marks). */
export function linkShareMessage(prompt: string | null | undefined, url: string): string {
  return stripIsolates(prompt ? translate("share.shareMessagePrompt", { prompt, url }) : translate("share.shareMessageDefault", { url }));
}
export const inviteMessage = (key: "share.inviteMessage" | "me.inviteMessage", url: string) => stripIsolates(translate(key, { url }));

/** Runs a share / clipboard / picker action; never throws, reports failure through `onError` (toast). Returns true on success. */
export async function safely(fn: () => Promise<unknown>, onError?: (e: unknown) => void): Promise<boolean> {
  try { await fn(); return true; } catch (e) { try { onError?.(e); } catch { /* ignore */ } return false; }
}
