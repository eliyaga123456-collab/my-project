import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getT } from "@/i18n/server";
import { rich } from "@/lib/rich";
import { CONTACT_EMAIL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("site.deleteAccount.title"), description: t("site.deleteAccount.metaDescription") };
}

export default async function DeleteAccount() {
  const { t } = await getT();
  const mail = { mail: (c: React.ReactNode) => <a href={`mailto:${c}`} dir="ltr">{c}</a> };
  return (
    <LegalPage title={t("site.deleteAccount.title")} intro={t("site.deleteAccount.intro")}>
      <h2>{t("site.deleteAccount.stepsH")}</h2>
      <ol>
        <li>{t("site.deleteAccount.step1")}</li>
        <li>{t("site.deleteAccount.step2")}</li>
        <li>{t("site.deleteAccount.step3")}</li>
      </ol>
      <h2>{t("site.deleteAccount.removedH")}</h2>
      <ul>
        <li>{t("site.deleteAccount.removed1")}</li>
        <li>{t("site.deleteAccount.removed2")}</li>
        <li>{t("site.deleteAccount.removed3")}</li>
      </ul>
      <h2>{t("site.deleteAccount.keptH")}</h2>
      <p>{t("site.deleteAccount.keptP")}</p>
      <h2>{t("site.deleteAccount.noAccessH")}</h2>
      <p>{rich(t("site.deleteAccount.noAccessP", { email: CONTACT_EMAIL }), mail)}</p>
    </LegalPage>
  );
}
