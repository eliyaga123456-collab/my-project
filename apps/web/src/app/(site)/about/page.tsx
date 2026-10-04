import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";
import { getT } from "@/i18n/server";
import { rich } from "@/lib/rich";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("site.nav.about"), description: t("site.about.metaDescription") };
}

export default async function About() {
  const { t } = await getT();
  const link = { link: (c: React.ReactNode) => <Link href="/privacy">{c}</Link> };
  return (
    <LegalPage title={t("site.about.title")} intro={t("site.about.intro")}>
      <h2>{t("site.about.whyH")}</h2>
      <p>{rich(t("site.about.whyP"))}</p>
      <h2>{t("site.about.believeH")}</h2>
      <ul>
        <li>{rich(t("site.about.b1"))}</li>
        <li>{rich(t("site.about.b2"))}</li>
        <li>{rich(t("site.about.b3"))}</li>
        <li>{rich(t("site.about.b4"), link)}</li>
      </ul>
      <h2>{t("site.about.dedicationH")}</h2>
      <p>{rich(t("site.about.dedicationP", { wordmark: "EAR*", dedication: t("common.brand.dedication") }))}</p>
      <h2>{t("site.about.startH")}</h2>
      <p>{rich(t("site.about.startP"), { link: (c) => <Link href="/install">{c}</Link> })}</p>
    </LegalPage>
  );
}
