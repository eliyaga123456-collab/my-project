import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getT } from "@/i18n/server";
import { rich } from "@/lib/rich";
import { CONTACT_EMAIL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("site.nav.privacy"), description: t("site.privacy.metaDescription") };
}

export default async function Privacy() {
  const { t } = await getT();
  const mail = { mail: (c: React.ReactNode) => <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr">{c}</a> };
  return (
    <LegalPage title={t("site.privacy.title")} intro={t("site.privacy.intro")} updated={t("site.privacy.updated")}>
      <h2>{t("site.privacy.howH")}</h2>
      <p>{rich(t("site.privacy.howP1"))}</p>
      <p>{rich(t("site.privacy.howP2"))}</p>
      <p>{rich(t("site.privacy.howP3"))}</p>
      <p>{rich(t("site.privacy.howP4"))}</p>
      <h2>{t("site.privacy.notH")}</h2>
      <ul>
        <li>{t("site.privacy.not1")}</li>
        <li>{t("site.privacy.not2")}</li>
        <li>{t("site.privacy.not3")}</li>
        <li>{t("site.privacy.not4")}</li>
      </ul>
      <h2>{t("site.privacy.collectH")}</h2>
      <ul>
        <li>{rich(t("site.privacy.collect1"))}</li>
        <li>{rich(t("site.privacy.collect2"))}</li>
        <li>{rich(t("site.privacy.collect3"))}</li>
        <li>{rich(t("site.privacy.collect4"))}</li>
      </ul>
      <h2>{t("site.privacy.cookiesH")}</h2>
      <p>{rich(t("site.privacy.cookiesP"))}</p>
      <h2>{t("site.privacy.moderationH")}</h2>
      <p>{t("site.privacy.moderationP")}</p>
      <h2>{t("site.privacy.retentionH")}</h2>
      <ul>
        <li>{t("site.privacy.retention1")}</li>
        <li>{t("site.privacy.retention2")}</li>
        <li>{t("site.privacy.retention3")}</li>
      </ul>
      <h2>{t("site.privacy.choicesH")}</h2>
      <p>{t("site.privacy.choicesP")}</p>
      <h2>{t("site.privacy.contactH")}</h2>
      <p>{rich(t("site.privacy.contactP", { email: CONTACT_EMAIL }), mail)}</p>
    </LegalPage>
  );
}
