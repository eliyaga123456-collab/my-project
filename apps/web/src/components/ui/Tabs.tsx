"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import { cx } from "./cx";

export interface TabItem { id: string; label: string; badge?: ReactNode }

export function Tabs({ tabs, value, onChange, label, idPrefix = "tab" }: { tabs: TabItem[]; value: string; onChange: (id: string) => void; label: string; idPrefix?: string }) {
  const { isRTL } = useT();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === value);
    let next = i;
    const fwd = isRTL ? "ArrowLeft" : "ArrowRight";
    const back = isRTL ? "ArrowRight" : "ArrowLeft";
    if (e.key === fwd) next = (i + 1) % tabs.length;
    else if (e.key === back) next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    const t = tabs[next];
    if (t) { onChange(t.id); refs.current[t.id]?.focus(); }
  };
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKey} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-raised p-1">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            role="tab"
            id={`${idPrefix}-${t.id}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cx(
              "inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition",
              active ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
            )}
          >
            {t.label}{t.badge}
          </button>
        );
      })}
    </div>
  );
}
