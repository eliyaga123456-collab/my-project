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

export type ShareTarget = "whatsapp" | "telegram" | "instagram" | "tiktok" | "sms";
const enc = encodeURIComponent;

/** Deep link that opens the target app. WhatsApp/Telegram/SMS take the text; Instagram and TikTok cannot be pre-filled, so the caller copies the link first. */
export function targetUrl(target: ShareTarget, text: string): string {
  switch (target) {
    case "whatsapp": return `whatsapp://send?text=${enc(text)}`;
    case "telegram": return `tg://msg?text=${enc(text)}`;
    case "sms": return `sms:?body=${enc(text)}`;
    case "instagram": return "instagram://story-camera";
    case "tiktok": return "snssdk1233://";
  }
}
/** Browser fallback when the app is not installed. */
export function targetWebUrl(target: ShareTarget, text: string, url: string): string | null {
  switch (target) {
    case "whatsapp": return `https://wa.me/?text=${enc(text)}`;
    case "telegram": return `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`;
    case "instagram": return "https://www.instagram.com/";
    case "tiktok": return "https://www.tiktok.com/";
    case "sms": return null;
  }
}
/** Instagram and TikTok have no "post this link" deep link: we copy the link and open the app so it can be pasted into a story/bio. */
export const needsClipboard = (t: ShareTarget) => t === "instagram" || t === "tiktok";
