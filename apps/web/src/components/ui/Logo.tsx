import { cx } from "./cx";

/** Unsaid mark: a speech bubble with an open "U" whose right stem lets a spark escape. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="um-g" x1="4" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff7440" />
          <stop offset=".55" stopColor="#b24cff" />
          <stop offset="1" stopColor="#6d62f2" />
        </linearGradient>
      </defs>
      <path d="M20 2.5c9.9 0 17.5 6.9 17.5 15.6S29.900 33.700 20 33.700c-1.700 0-3.300-.2-4.800-.6L7 37.500l1.900-6.300C5.300 28.500 2.500 23.800 2.500 18.100 2.500 9.400 10.100 2.500 20 2.500Z" fill="url(#um-g)" />
      <path d="M12.500 11.500v7.200c0 4.100 3.100 6.800 7.500 6.800s7.500-2.700 7.500-6.800" stroke="#fff" strokeWidth="3.400" strokeLinecap="round" />
      <circle cx="27.500" cy="10.200" r="2.300" fill="#fff" />
    </svg>
  );
}

export function Logo({ className, size = 30, wordmark = true }: { className?: string; size?: number; wordmark?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {wordmark && <span className="font-display text-xl font-extrabold tracking-tight">Unsaid</span>}
    </span>
  );
}
