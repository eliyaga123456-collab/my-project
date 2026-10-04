import type { Metadata } from "next";
import { LinksView } from "@/components/app/LinksView";
import { PageHeader } from "@/components/app/PageHeader";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("app.pages.linksTitle") };
}

export default async function Page() {
  const { t } = await getT();
  return (
    <>
      <PageHeader title={t("app.pages.linksTitle")} description={t("app.pages.linksDescription")} />
      <LinksView />
    </>
  );
}
