import type { Metadata } from "next";
import { InboxView } from "@/components/inbox/InboxView";
import { PageHeader } from "@/components/app/PageHeader";
import { getT } from "@/i18n/server";
import { getMe } from "@/lib/server-api";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("app.pages.inboxTitle") };
}

export default async function InboxPage() {
  const me = await getMe();
  const { t } = await getT();
  return (
    <>
      <PageHeader title={t("app.pages.inboxTitle")} description={t("app.pages.inboxDescription")} />
      <InboxView shareUrlPath={`/u/${me?.profile.username ?? ""}`} />
    </>
  );
}
