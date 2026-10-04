import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getT } from "@/i18n/server";
import { rich } from "@/lib/rich";
import { SAFETY_EMAIL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("site.nav.safety"), description: t("site.safety.metaDescription") };
}

export default async function Safety() {
  const { t } = await getT();
  const mail = { mail: (c: React.ReactNode) => <a href={`mailto:${SAFETY_EMAIL}`} dir="ltr">{c}</a> };
  return (
    <LegalPage title={t("site.safety.title")} intro={t("site.safety.intro")}>
      <h2>{t("site.safety.protectH")}</h2>
      <ul>
        <li>{rich(t("site.safety.protect1"))}</li>
        <li>{rich(t("site.safety.protect2"))}</li>
        <li>{rich(t("site.safety.protect3"))}</li>
        <li>{rich(t("site.safety.protect4"))}</li>
        <li>{rich(t("site.safety.protect5"))}</li>
        <li>{rich(t("site.safety.protect6"))}</li>
        <li>{rich(t("site.safety.protect7"))}</li>
      </ul>
      <h2>{t("site.safety.harassedH")}</h2>
      <ul>
        <li>{t("site.safety.harassed1")}</li>
        <li>{t("site.safety.harassed2")}</li>
        <li>{t("site.safety.harassed3")}</li>
      </ul>
      <h2>{t("site.safety.strugglingH")}</h2>
      <p>{t("site.safety.strugglingP")}</p>
      <h2>{t("site.safety.sendingH")}</h2>
      <p>{t("site.safety.sendingP")}</p>
      <h2>{t("site.safety.teamH")}</h2>
      <p>{rich(t("site.safety.teamP", { email: SAFETY_EMAIL }), mail)}</p>
    </LegalPage>
  );
}
