import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="animate-ink-in">
      <div className="veil glow-border-soft p-6 sm:p-8">
        <h1 className="grad-text text-3xl font-extrabold">{title}</h1>
        {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <p className="mt-5 text-center text-sm text-muted">{footer}</p>}
    </div>
  );
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{message}</p>;
}
