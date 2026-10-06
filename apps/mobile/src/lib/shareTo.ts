import { Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import { needsClipboard, targetUrl, targetWebUrl, type ShareTarget } from "./share";

const CHANNEL: Record<ShareTarget, string> = { whatsapp: "wa", telegram: "tg", instagram: "ig", tiktok: "tt", sms: "sms" };
/** Tags a link with the channel it is shared through (safety evidence + aggregate stats; no identity). */
export const withSrc = (url: string, src: string) => (url.includes("?") ? `${url}&src=${src}` : `${url}?src=${src}`);

export type ShareToResult = "app" | "web" | "failed";

/** Opens WhatsApp/Telegram/SMS pre-filled, or copies the link and opens Instagram/TikTok. Falls back to the website, never throws. */
export async function shareTo(target: ShareTarget, rawText: string, rawUrl: string): Promise<ShareToResult> {
  const url = withSrc(rawUrl, CHANNEL[target]);
  const text = rawText.split(rawUrl).join(url);
  if (needsClipboard(target)) await Clipboard.setStringAsync(url).catch(() => undefined);
  try { await Linking.openURL(targetUrl(target, text)); return "app"; } catch { /* app not installed */ }
  const web = targetWebUrl(target, text, url);
  if (web) { try { await Linking.openURL(web); return "web"; } catch { /* ignore */ } }
  return "failed";
}
