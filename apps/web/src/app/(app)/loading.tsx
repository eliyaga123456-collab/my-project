import { ListSkeleton, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-6 h-9 w-40" />
      <ListSkeleton rows={3} />
    </div>
  );
}
