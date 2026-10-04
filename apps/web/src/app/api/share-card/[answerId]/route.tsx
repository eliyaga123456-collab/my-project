import { renderShareCard } from "@/lib/share-card";

export const dynamic = "force-dynamic";

/** Downloadable share-card PNG (same design as the OG image). */
export async function GET(_req: Request, { params }: { params: Promise<{ answerId: string }> }) {
  const { answerId } = await params;
  return renderShareCard(answerId, { "content-disposition": 'attachment; filename="unsaid-answer.png"' });
}
