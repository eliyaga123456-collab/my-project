"use client";

import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cx } from "./cx";

const control =
  "w-full rounded-md border border-line bg-raised/60 px-4 text-[1rem] text-fg placeholder:text-muted/80 transition focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/40 disabled:opacity-60 aria-[invalid=true]:border-danger";

interface FieldShell {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  counter?: ReactNode;
  trailing?: ReactNode;
  hideLabel?: boolean;
}

export function InputField({ label, hint, error, trailing, hideLabel, className, id, ...rest }: FieldShell & ComponentProps<"input">) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={fid} className={cx("mb-1.5 block text-sm font-medium", hideLabel && "sr-only")}>{label}</label>
      <div className="relative">
        <input
          id={fid}
          className={cx(control, "h-12", trailing ? "pr-12" : "")}
          aria-invalid={error ? true : undefined}
          aria-describedby={cx(hint && `${fid}-hint`, error && `${fid}-err`) || undefined}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-3 flex items-center">{trailing}</div>}
      </div>
      {hint && <p id={`${fid}-hint`} className="mt-1.5 text-[0.82rem] text-muted">{hint}</p>}
      {error && <p id={`${fid}-err`} role="alert" className="mt-1.5 text-[0.82rem] font-medium text-danger">{error}</p>}
    </div>
  );
}

export function TextareaField({ label, hint, error, counter, hideLabel, className, id, ...rest }: FieldShell & ComponentProps<"textarea">) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={fid} className={cx("mb-1.5 block text-sm font-medium", hideLabel && "sr-only")}>{label}</label>
      <textarea
        id={fid}
        className={cx(control, "min-h-28 resize-y py-3 leading-relaxed")}
        aria-invalid={error ? true : undefined}
        aria-describedby={cx(hint && `${fid}-hint`, error && `${fid}-err`) || undefined}
        {...rest}
      />
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {hint && <p id={`${fid}-hint`} className="text-[0.82rem] text-muted">{hint}</p>}
          {error && <p id={`${fid}-err`} role="alert" className="text-[0.82rem] font-medium text-danger">{error}</p>}
        </div>
        {counter && <div className="shrink-0 text-[0.82rem] tabular-nums text-muted">{counter}</div>}
      </div>
    </div>
  );
}
