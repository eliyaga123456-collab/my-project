import type { Metadata } from "next";
import { LinksView } from "@/components/app/LinksView";
import { PageHeader } from "@/components/app/PageHeader";

export const metadata: Metadata = { title: "Your links" };

export default function LinksPage() {
  return (
    <>
      <PageHeader title="Your links" description="Share your link anywhere. Manage it here." />
      <LinksView />
    </>
  );
}
