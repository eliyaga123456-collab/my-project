import type { Metadata } from "next";
import { AnalyticsView } from "@/components/app/AnalyticsView";
import { PageHeader } from "@/components/app/PageHeader";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Analytics" description="How your links are doing. Counts only, never sender details." />
      <AnalyticsView />
    </>
  );
}
