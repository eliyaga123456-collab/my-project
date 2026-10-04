/** Public origin. Server-side code reads SITE_URL at RUNTIME (so one image works on any host); NEXT_PUBLIC_SITE_URL is the build-time fallback. */
export const SITE_URL = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@ear.example";
export const SAFETY_EMAIL = process.env.NEXT_PUBLIC_SAFETY_EMAIL ?? "safety@ear.example";
/** Store listings (set once the native apps are published). When empty the web app (PWA) is offered instead. */
export const IOS_APP_URL = process.env.NEXT_PUBLIC_IOS_APP_URL ?? "";
export const ANDROID_APP_URL = process.env.NEXT_PUBLIC_ANDROID_APP_URL ?? "";
/** Direct APK download (GitHub release asset by default). */
export const APK_URL = process.env.APK_URL ?? process.env.NEXT_PUBLIC_APK_URL ?? "https://github.com/eliyaga123456-collab/my-project/releases/latest/download/EAR.apk";
export const INSTALL_PATH = "/install";
/** Desktop apps are published to the stable GitHub release tagged `desktop` by .github/workflows/desktop.yml. */
const DESKTOP_BASE = process.env.NEXT_PUBLIC_DESKTOP_BASE ?? "https://github.com/eliyaga123456-collab/my-project/releases/download/desktop";
export const DESKTOP_URLS = {
  windows: `${DESKTOP_BASE}/EAR-Windows-Setup.exe`,
  macArm: `${DESKTOP_BASE}/EAR-macOS-arm64.dmg`,
  macIntel: `${DESKTOP_BASE}/EAR-macOS-x64.dmg`,
  linux: `${DESKTOP_BASE}/EAR-Linux.AppImage`
} as const;
