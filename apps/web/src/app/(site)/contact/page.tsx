import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getT } from "@/i18n/server";
import { rich } from "@/lib/rich";
import { CONTACT_EMAIL, SAFETY_EMAIL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("site.nav.contact"), description: t("site.contact.metaDescription") };
}

export default async function Contact() {
  const { t } = await getT();
  const p = { email: CONTACT_EMAIL, safetyEmail: SAFETY_EMAIL };
  // The address is part of the sentence (a param), so the link text and href come from the same value.
  const mail = { mail: (c: React.ReactNode) => <a href={`mailto:${c}`} dir="ltr">{c}</a> };
  return (
    <LegalPage title={t("site.contact.title")} intro={t("site.contact.intro")}>
      <h2>{t("site.contact.generalH")}</h2>
      <p>{rich(t("site.contact.generalP", p), mail)}</p>
      <h2>{t("site.contact.safetyH")}</h2>
      <p>{rich(t("site.contact.safetyP", p), mail)}</p>
      <h2>{t("site.contact.privacyH")}</h2>
      <p>{rich(t("site.contact.privacyP", p), mail)}</p>
      <h2>{t("site.contact.securityH")}</h2>
      <p>{rich(t("site.contact.securityP", p), mail)}</p>
    </LegalPage>
  );
}
