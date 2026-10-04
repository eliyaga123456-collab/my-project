export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@ear.example";
export const SAFETY_EMAIL = process.env.NEXT_PUBLIC_SAFETY_EMAIL ?? "safety@ear.example";
/** Store listings (set once the native apps are published). When empty the web app (PWA) is offered instead. */
export const IOS_APP_URL = process.env.NEXT_PUBLIC_IOS_APP_URL ?? "";
export const ANDROID_APP_URL = process.env.NEXT_PUBLIC_ANDROID_APP_URL ?? "";
export const INSTALL_PATH = "/install";
