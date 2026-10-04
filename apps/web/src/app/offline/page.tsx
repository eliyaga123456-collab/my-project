import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("site.offline.metaTitle"), robots: { index: false } };
}

export default async function Offline() {
  const { t } = await getT();
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <WifiOff className="mx-auto size-12 text-muted" aria-hidden />
        <h1 className="mt-4 text-3xl font-extrabold">{t("site.offline.title")}</h1>
        <p className="mt-2 max-w-sm text-muted">{t("site.offline.body")}</p>
        <a href="/" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-on-primary">{t("common.state.retry")}</a>
      </div>
    </main>
  );
}
