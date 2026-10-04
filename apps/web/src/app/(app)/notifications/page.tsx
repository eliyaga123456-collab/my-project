import type { Metadata } from "next";
import { NotificationsView } from "@/components/app/NotificationsView";
import { PageHeader } from "@/components/app/PageHeader";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("app.pages.notificationsTitle") };
}

export default async function Page() {
  const { t } = await getT();
  return (
    <>
      <PageHeader title={t("app.pages.notificationsTitle")} />
      <NotificationsView />
    </>
  );
}
