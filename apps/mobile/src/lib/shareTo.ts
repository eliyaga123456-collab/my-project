import { Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import { needsClipboard, targetUrl, targetWebUrl, type ShareTarget } from "./share";

export type ShareToResult = "app" | "web" | "failed";

/** Opens WhatsApp/Telegram/SMS pre-filled, or copies the link and opens Instagram/TikTok. Falls back to the website, never throws. */
export async function shareTo(target: ShareTarget, text: string, url: string): Promise<ShareToResult> {
  if (needsClipboard(target)) await Clipboard.setStringAsync(url).catch(() => undefined);
  try { await Linking.openURL(targetUrl(target, text)); return "app"; } catch { /* app not installed */ }
  const web = targetWebUrl(target, text, url);
  if (web) { try { await Linking.openURL(web); return "web"; } catch { /* ignore */ } }
  return "failed";
}
