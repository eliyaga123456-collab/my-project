import type { ReactNode } from "react";
import { useT } from "../i18n";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "ember";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

const STATUS_TONE: Record<string, Tone> = {
  active: "success", ok: "success", resolved: "success", allow: "success", allowed: "success",
  suspended: "warning", degraded: "warning", open: "warning", hold: "warning", held: "warning",
  banned: "danger", rejected: "danger", reject: "danger", dismissed: "neutral"
};
export function StatusBadge({ status }: { status: string }) {
  const { te } = useT();
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{te("status", status)}</Badge>;
}
