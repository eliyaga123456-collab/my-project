import { Linking, Platform } from "react-native";
import Constants from "expo-constants";

/** In-app updater for the sideloaded Android APK. Release builds are published as GitHub Releases tagged `apk-<build number>`. */
const REPO = process.env.EXPO_PUBLIC_UPDATE_REPO ?? "";

export interface UpdateInfo { available: boolean; installed: number; latest: number; apkUrl: string; notes: string }

export const updaterEnabled = () => Platform.OS === "android" && REPO.length > 0;
export const installedBuild = (): number => Number(Constants.expoConfig?.android?.versionCode) || 0;
export const apkUrlFor = (repo: string) => `https://github.com/${repo}/releases/latest/download/EAR.apk`;

/** Parses `apk-12` -> 12. Anything else -> null. */
export function parseBuildTag(tag: unknown): number | null {
  if (typeof tag !== "string") return null;
  const m = /^apk-(\d{1,9})$/.exec(tag.trim());
  return m ? Number(m[1]) : null;
}

export function compareBuilds(installed: number, release: { tag_name?: unknown; body?: unknown } | null | undefined, repo = REPO): UpdateInfo | null {
  const latest = parseBuildTag(release?.tag_name);
  if (latest === null) return null;
  return { available: latest > installed, installed, latest, apkUrl: apkUrlFor(repo), notes: typeof release?.body === "string" ? release.body : "" };
}

let cache: { at: number; value: UpdateInfo | null } | null = null;
const SIX_HOURS = 6 * 60 * 60 * 1000;

/** Never throws. Returns null when the updater is disabled, offline, rate-limited or the release has an unexpected shape. */
export async function checkForUpdate(force = false): Promise<UpdateInfo | null> {
  if (!updaterEnabled()) return null;
  if (!force && cache && Date.now() - cache.at < SIX_HOURS) return cache.value;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10_000);
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { accept: "application/vnd.github+json" }, signal: ctl.signal });
    if (!r.ok) return cache?.value ?? null;
    const value = compareBuilds(installedBuild(), await r.json());
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return cache?.value ?? null;
  } finally {
    clearTimeout(timer);
  }
}

export type InstallResult = "installer" | "needs-permission" | "browser";

/** Downloads the APK into the app cache and hands it to Android's package installer. Falls back to the browser download on any failure. */
export async function downloadAndInstall(apkUrl: string, onProgress?: (fraction: number) => void): Promise<InstallResult> {
  try {
    const FileSystem = await import("expo-file-system/legacy");
    const IntentLauncher = await import("expo-intent-launcher");
    const dest = `${FileSystem.cacheDirectory}EAR-update.apk`;
    await FileSystem.deleteAsync(dest, { idempotent: true });
    const task = FileSystem.createDownloadResumable(apkUrl, dest, {}, (p) => {
      if (p.totalBytesExpectedToWrite > 0) onProgress?.(p.totalBytesWritten / p.totalBytesExpectedToWrite);
    });
    const res = await task.downloadAsync();
    if (!res || res.status !== 200) throw new Error(`download failed (${res?.status ?? "no response"})`);
    const contentUri = await FileSystem.getContentUriAsync(res.uri);
    try {
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: contentUri, flags: 1, type: "application/vnd.android.package-archive" });
      return "installer";
    } catch {
      // Android blocks installs from this app until the user allows it in Settings.
      await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, { data: `package:${Constants.expoConfig?.android?.package ?? "app.ear.mobile"}` });
      return "needs-permission";
    }
  } catch {
    await Linking.openURL(apkUrl).catch(() => undefined);
    return "browser";
  }
}
