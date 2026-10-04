"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "./cx";

export interface MenuItem { id: string; label: string; icon?: ReactNode; danger?: boolean; disabled?: boolean; onSelect: () => void }

/** Menu button with arrow-key navigation, Home/End, type-less simplicity, ESC to close and focus return. */
export function Dropdown({ label, trigger, items, align = "end", triggerClassName }: {
  label: string; trigger: ReactNode; items: MenuItem[]; align?: "start" | "end"; triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    const first = refs.current.find((r) => r && !r.disabled);
    first?.focus();
    const onDown = (e: MouseEvent | TouchEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); };
  }, [open]);

  const close = (refocus = true) => { setOpen(false); if (refocus) btn.current?.focus(); };

  const onMenuKey = (e: KeyboardEvent) => {
    const enabled = refs.current.filter((r): r is HTMLButtonElement => !!r && !r.disabled);
    const idx = enabled.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); enabled[(idx + 1) % enabled.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); enabled[(idx - 1 + enabled.length) % enabled.length]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); enabled[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); enabled[enabled.length - 1]?.focus(); }
    else if (e.key === "Tab") setOpen(false);
  };

  return (
    <div ref={root} className="relative inline-block">
      <button
        ref={btn}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "ArrowDown" && !open) { e.preventDefault(); setOpen(true); } }}
        className={triggerClassName ?? "inline-flex size-11 items-center justify-center rounded-full text-muted transition hover:bg-raised hover:text-fg"}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={cx("animate-pop absolute z-50 mt-2 min-w-52 rounded-md border border-line bg-surface p-1.5 shadow-[var(--shadow)]", align === "end" ? "right-0" : "left-0")}
        >
          {items.map((it, i) => (
            <button
              key={it.id}
              ref={(el) => { refs.current[i] = el; }}
              role="menuitem"
              type="button"
              disabled={it.disabled}
              onClick={() => { close(false); it.onSelect(); }}
              className={cx(
                "flex min-h-11 w-full items-center gap-3 rounded-sm px-3 text-left text-sm font-medium transition focus:bg-raised focus:outline-none hover:bg-raised disabled:opacity-50",
                it.danger ? "text-danger" : "text-fg"
              )}
            >
              {it.icon && <span className="shrink-0" aria-hidden>{it.icon}</span>}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
