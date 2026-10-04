export const dynamic = "force-dynamic";

/** Liveness for the hosting platform (the API has its own /health behind /api/v1 proxying). */
export function GET() {
  return Response.json({ status: "ok" });
}
