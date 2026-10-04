import type { Metadata } from "next";
import { AnalyticsView } from "@/components/app/AnalyticsView";
import { PageHeader } from "@/components/app/PageHeader";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("app.pages.analyticsTitle") };
}

export default async function Page() {
  const { t } = await getT();
  return (
    <>
      <PageHeader title={t("app.pages.analyticsTitle")} description={t("app.pages.analyticsDescription")} />
      <AnalyticsView />
    </>
  );
}
