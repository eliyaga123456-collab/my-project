import type { Metadata } from "next";
import QRCode from "qrcode";
import { InstallPanel } from "@/components/pwa/InstallPanel";
import { getT } from "@/i18n/server";
import { INSTALL_PATH, SITE_URL } from "@/lib/site";
import { gradTag, rich } from "@/lib/rich";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("common.nav.getTheApp"),
    description: t("site.install.metaDescription"),
    openGraph: { title: t("site.install.ogTitle"), description: t("site.install.ogDescription") }
  };
}

export default async function InstallPage() {
  const { t } = await getT();
  const svg = await QRCode.toString(`${SITE_URL}${INSTALL_PATH}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#11101e", light: "#ffffff" } });
  const qrDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-4xl font-extrabold sm:text-5xl">{rich(t("site.install.title"), gradTag)}</h1>
      <p className="mt-3 text-lg text-muted">{t("site.install.lead")}</p>
      <div className="mt-8"><InstallPanel qrDataUri={qrDataUri} /></div>
    </div>
  );
}
