"use client";

import { useId } from "react";
import { cx } from "./cx";

export function Switch({
  checked, onChange, label, description, disabled
}: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer font-medium">{label}</label>
        {description && <p id={`${id}-d`} className="text-sm text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50",
          checked ? "grad-bg" : "bg-raised ring-1 ring-line"
        )}
      >
        <span className={cx("absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform duration-200", checked && "translate-x-5")} />
      </button>
    </div>
  );
}
