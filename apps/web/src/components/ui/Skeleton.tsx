import { cx } from "./cx";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("skeleton", className)} />;
}

export function MessageCardSkeleton() {
  return (
    <div className="veil p-5" aria-hidden>
      <Skeleton className="mb-4 h-3 w-24" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-5 h-4 w-3/5" />
      <div className="flex gap-2"><Skeleton className="h-9 w-24 rounded-full" /><Skeleton className="h-9 w-9 rounded-full" /></div>
    </div>
  );
}

export function ListSkeleton({ rows = 3, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, i) => <MessageCardSkeleton key={i} />)}
    </div>
  );
}
