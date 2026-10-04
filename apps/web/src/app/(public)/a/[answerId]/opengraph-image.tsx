import { renderShareCard } from "@/lib/share-card";

export const alt = "An answer on EAR";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ answerId: string }> }) {
  const { answerId } = await params;
  return renderShareCard(answerId);
}
