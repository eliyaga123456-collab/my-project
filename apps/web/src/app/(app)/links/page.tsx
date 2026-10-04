import type { Metadata } from "next";
import { LinksView } from "@/components/app/LinksView";
import { PageHeader } from "@/components/app/PageHeader";

export const metadata: Metadata = { title: "Rounds & links" };

export default function LinksPage() {
  return (
    <>
      <PageHeader title="Rounds & links" description="Start an anonymous round, share its link, and follow the answers." />
      <LinksView />
    </>
  );
}
