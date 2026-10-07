import type { ReactNode } from "react";
import { CountUp } from "./CountUp";

export function Card({ title, actions, children, className = "", as: Tag = "section" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return (
    <Tag className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h2 className="card-title">{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}

export function StatCard({ label, value, hint, tone, count, format, index = 0 }: { label: string; value?: ReactNode; hint?: string; tone?: "danger" | "warning"; count?: number; format?: (n: number) => string; index?: number }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ""}`} style={{ "--i": index } as React.CSSProperties}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{count !== undefined ? <CountUp value={count} format={format ?? String} /> : value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
