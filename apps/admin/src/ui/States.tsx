import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { useT } from "../i18n";
import { Button } from "./Button";

export function Skeleton({ height = 16, width = "100%", radius }: { height?: number; width?: number | string; radius?: number }) {
  return <span className="skeleton" style={{ height, width, borderRadius: radius }} aria-hidden />;
}

export function SkeletonRows({ rows = 5, label }: { rows?: number; label?: string }) {
  const { t } = useT();
  return (
    <div className="skeleton-rows" role="status" aria-label={label ?? t("common.loading")}>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} height={44} radius={10} />)}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="state" role="status">
      <Inbox size={28} aria-hidden />
      <p className="state-title">{title}</p>
      {hint && <p className="state-hint">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry, title }: { message: string; onRetry?: () => void; title?: string }) {
  const { t } = useT();
  return (
    <div className="state state-error" role="alert">
      <AlertTriangle size={28} aria-hidden />
      <p className="state-title">{title ?? t("common.couldntLoad")}</p>
      <p className="state-hint">{message}</p>
      {onRetry && <Button size="sm" icon={<RefreshCw size={14} aria-hidden />} onClick={onRetry}>{t("common.tryAgain")}</Button>}
    </div>
  );
}
