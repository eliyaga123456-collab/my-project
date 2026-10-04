import type { Metadata } from "next";
import { InboxView } from "@/components/inbox/InboxView";
import { PageHeader } from "@/components/app/PageHeader";
import { getMe } from "@/lib/server-api";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  const me = await getMe();
  return (
    <>
      <PageHeader title="Inbox" description="Anonymous messages, just for you." />
      <InboxView shareUrlPath={`/u/${me?.profile.username ?? ""}`} />
    </>
  );
}
