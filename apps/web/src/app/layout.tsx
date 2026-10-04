import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import "./globals.css";
import { ToastProvider } from "@/components/ui";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Unsaid — say the unsaid", template: "%s · Unsaid" },
  description: "Get your personal link, receive anonymous messages, reply on your terms. Kind by design, safe by default.",
  applicationName: "Unsaid",
  openGraph: { type: "website", siteName: "Unsaid", title: "Unsaid — say the unsaid", description: "Anonymous questions, answered on your terms." },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg" }
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script>{themeInit}</script>
      </head>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg">Skip to content</a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
