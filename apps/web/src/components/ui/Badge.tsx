import type { ReactNode } from "react";
import { cx } from "./cx";

type Tone = "neutral" | "ember" | "mist" | "success" | "warning" | "danger";
const tones: Record<Tone, string> = {
  neutral: "bg-raised text-muted",
  ember: "bg-primary/15 text-primary",
  mist: "bg-secondary/15 text-secondary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger"
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

/** Numeric counter pill used on navigation items. */
export function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span className="grad-bg inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[0.7rem] font-bold leading-5 text-[#1a0d07]">
      <span aria-hidden>{count > 99 ? "99+" : count}</span>
      <span className="sr-only">{count} {label}</span>
    </span>
  );
}
