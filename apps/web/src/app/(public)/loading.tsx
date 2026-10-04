import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col items-center gap-3"><Skeleton className="size-24 rounded-full" /><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64" /></div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
