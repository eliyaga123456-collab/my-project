import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";
import { getT } from "@/i18n/server";
import { rich } from "@/lib/rich";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("site.terms.metaTitle"), description: t("site.terms.metaDescription") };
}

export default async function Terms() {
  const { t } = await getT();
  const links = { safety: (c: React.ReactNode) => <Link href="/safety">{c}</Link>, privacy: (c: React.ReactNode) => <Link href="/privacy">{c}</Link> };
  return (
    <LegalPage title={t("site.terms.title")} intro={t("site.terms.intro")} updated={t("site.terms.updated")}>
      <h2>{t("site.terms.usingH")}</h2>
      <p>{t("site.terms.usingP")}</p>
      <h2>{t("site.terms.noH")}</h2>
      <ul>
        <li>{t("site.terms.no1")}</li>
        <li>{t("site.terms.no2")}</li>
        <li>{t("site.terms.no3")}</li>
        <li>{t("site.terms.no4")}</li>
        <li>{t("site.terms.no5")}</li>
      </ul>
      <h2>{t("site.terms.anonH")}</h2>
      <p>{rich(t("site.terms.anonP"), links)}</p>
      <h2>{t("site.terms.contentH")}</h2>
      <p>{t("site.terms.contentP")}</p>
      <h2>{t("site.terms.availH")}</h2>
      <p>{t("site.terms.availP")}</p>
      <h2>{t("site.terms.endingH")}</h2>
      <p>{t("site.terms.endingP")}</p>
      <h2>{t("site.terms.changesH")}</h2>
      <p>{t("site.terms.changesP")}</p>
    </LegalPage>
  );
}
