import type { Metadata } from "next";
import { NotificationsView } from "@/components/app/NotificationsView";
import { PageHeader } from "@/components/app/PageHeader";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notifications" />
      <NotificationsView />
    </>
  );
}
