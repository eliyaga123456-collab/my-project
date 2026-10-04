import type { ReactNode } from "react";

export function SettingsCard({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="veil p-5 sm:p-7">
      <div className="relative">
        <h2 id={id} className="text-xl font-bold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}
