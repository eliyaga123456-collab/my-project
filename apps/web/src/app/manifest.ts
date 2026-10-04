import type { MetadataRoute } from "next";
import { getT } from "@/i18n/server";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { t, locale, dir } = await getT();
  return {
    id: "/",
    name: t("site.meta.manifestName"),
    lang: locale,
    dir,
    short_name: "EAR",
    description: t("site.meta.manifestDescription"),
    // Static manifest: launched from the Home Screen the app opens the inbox; the (app) layout sends signed-out users to /login.
    start_url: "/inbox",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0a14",
    theme_color: "#0b0a14",
    categories: ["social", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
