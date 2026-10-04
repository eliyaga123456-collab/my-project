import type { ReactNode } from "react";

/** Isolates LTR data (emails, @usernames, ids, URLs) inside RTL text. */
export function Ltr({ children, className = "", title }: { children: ReactNode; className?: string; title?: string }) {
  return <bdi dir="ltr" className={`ltr ${className}`} title={title}>{children}</bdi>;
}
