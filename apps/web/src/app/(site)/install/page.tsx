import type { Metadata } from "next";
import QRCode from "qrcode";
import { InstallPanel } from "@/components/pwa/InstallPanel";
import { INSTALL_PATH, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Get the app",
  description: "Install EAR on your phone or computer in a few taps.",
  openGraph: { title: "Get EAR", description: "Anonymous questions & replies. Install it in a few taps." }
};

export default async function InstallPage() {
  const svg = await QRCode.toString(`${SITE_URL}${INSTALL_PATH}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#11101e", light: "#ffffff" } });
  const qrDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Get <span className="grad-text">EAR</span> on your phone</h1>
      <p className="mt-3 text-lg text-muted">Install it like any app: full screen, one tap from your home screen, and notifications when someone writes to you.</p>
      <div className="mt-8"><InstallPanel qrDataUri={qrDataUri} /></div>
    </div>
  );
}
