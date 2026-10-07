import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "./Button";
import { cx } from "./cx";

export function EmptyState({
  title, description, action, icon, className
}: { title: string; description?: string; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cx("veil-soft flex flex-col items-center rounded-lg border border-dashed border-line bg-surface/40 px-6 py-14 text-center animate-ink-in", className)}>
      <div className="empty-orb mb-4 grid size-14 place-items-center rounded-full bg-raised text-secondary">{icon ?? <Inbox className="size-6" aria-hidden />}</div>
      <h2 className="text-xl font-bold">{title}</h2>
      {description && <p className="mt-1.5 max-w-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title, message, onRetry, retryLabel, className
}: { title: string; message?: string; onRetry?: () => void; retryLabel?: string; className?: string }) {
  return (
    <div role="alert" className={cx("flex flex-col items-center rounded-lg border border-danger/30 bg-danger/5 px-6 py-12 text-center", className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-danger/15 text-danger"><AlertTriangle className="size-6" aria-hidden /></div>
      <h2 className="text-lg font-bold">{title}</h2>
      {message && <p className="mt-1.5 max-w-sm text-muted">{message}</p>}
      {onRetry && <Button className="mt-5" variant="secondary" onClick={onRetry}>{retryLabel}</Button>}
    </div>
  );
}
