import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = "secondary", size = "md", loading, icon, children, disabled, className = "", type = "button", ...rest }: Props) {
  return (
    <button type={type} className={`btn btn-${variant} btn-${size} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="spin" size={16} aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className = "", type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type={type} className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>{children}</button>;
}
