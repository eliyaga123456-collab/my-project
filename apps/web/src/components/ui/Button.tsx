import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string) {
  return cx(
    "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition duration-150 ease-out",
    "active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    size === "sm" && "min-h-9 rounded-full px-3.5 text-sm",
    size === "md" && "min-h-11 rounded-full px-5 text-[0.95rem]",
    size === "lg" && "min-h-13 rounded-full px-7 text-base",
    variant === "primary" && "grad-bg text-[#1a0d07] shadow-[0_8px_30px_-8px_rgba(255,116,64,.7)] hover:brightness-110 hover:shadow-[0_10px_34px_-6px_rgba(255,116,64,.8)]",
    variant === "secondary" && "bg-raised text-fg hover:bg-[color-mix(in_srgb,var(--surface-raised)_82%,var(--text)_8%)]",
    variant === "outline" && "border border-line bg-transparent text-fg hover:bg-raised",
    variant === "ghost" && "bg-transparent text-fg hover:bg-raised",
    variant === "danger" && "bg-danger text-[#1a0508] hover:brightness-110",
    extra
  );
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leading?: ReactNode;
}

export function Button({ variant, size, loading, leading, className, children, disabled, type = "button", ...rest }: BtnProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : leading}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, ...rest }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}

export function IconButton({
  label, className, children, variant = "ghost", ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: "ghost" | "secondary" | "outline" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full transition duration-150 active:translate-y-0.5 disabled:opacity-50",
        variant === "ghost" && "text-muted hover:bg-raised hover:text-fg",
        variant === "secondary" && "bg-raised text-fg hover:brightness-110",
        variant === "outline" && "border border-line text-fg hover:bg-raised",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
