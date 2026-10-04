import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import "@fontsource-variable/heebo";
import "./globals.css";
import { ToastProvider } from "@/components/ui";
import { SITE_URL } from "@/lib/site";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { I18nProvider } from "@/i18n/client";
import { getT } from "@/i18n/server";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "EAR — say what you really think", template: "%s · EAR" },
  description: "Get your personal link, receive anonymous messages, reply on your terms. Kind by design, safe by default.",
  applicationName: "EAR",
  openGraph: { type: "website", siteName: "EAR", title: "EAR — say what you really think", description: "Anonymous questions, answered on your terms." },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "EAR", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0a14" },
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" }
  ]
};

// Constant string, no user input: applies a saved theme override before first paint.
const themeInit = `try{var t=localStorage.getItem('unsaid-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, dir, t } = await getT();
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <script>{themeInit}</script>
      </head>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg">{t("common.nav.skip")}</a>
        <I18nProvider locale={locale}><ToastProvider>{children}</ToastProvider></I18nProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
