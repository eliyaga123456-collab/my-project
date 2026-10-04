import { cx } from "./cx";

/** EAR mark: a speech bubble holding an ear outline, with a spark of sound escaping. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="ear-g" x1="4" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff7440" />
          <stop offset=".55" stopColor="#b24cff" />
          <stop offset="1" stopColor="#6d62f2" />
        </linearGradient>
      </defs>
      <path d="M20 2.5c9.9 0 17.5 6.9 17.5 15.6S29.900 33.700 20 33.700c-1.700 0-3.300-.2-4.800-.6L7 37.500l1.900-6.300C5.300 28.500 2.500 23.800 2.500 18.100 2.500 9.400 10.100 2.500 20 2.500Z" fill="url(#ear-g)" />
      <path d="M13 17.600c0-4.600 3-8 7.200-8s7 3.200 7 7c0 3.400-2.300 4.600-3.600 6.200-.9 1.100-.8 2.300-1.400 3.500-.8 1.600-2.400 2.400-4 2.100" stroke="#fff" strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.200 17.800c.2-1.700 1.400-2.700 2.900-2.600 1.600.1 2.600 1.500 2.100 3-.4 1.200-1.600 1.700-2 2.800" stroke="#fff" strokeWidth="2.200" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** "EAR*" — the asterisk points to the dedication in the footer / about page. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx("font-display font-extrabold tracking-tight", className)}>
      EAR<sup className="grad-text ml-0.5 text-[0.62em] font-black" title="For Liron" aria-hidden="true">*</sup>
      <span className="sr-only"> (dedicated to Liron)</span>
    </span>
  );
}

export function Logo({ className, size = 30, wordmark = true }: { className?: string; size?: number; wordmark?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {wordmark && <Wordmark className="text-xl" />}
    </span>
  );
}
