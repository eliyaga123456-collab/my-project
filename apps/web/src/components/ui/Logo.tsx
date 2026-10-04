"use client";

import { useId } from "react";
import { useT } from "@/i18n/client";
import { cx } from "./cx";

/** EAR mark: an ear with sound waves arriving from the side. Waves pulse inward on hover/focus, or continuously with `animated`. */
export function LogoMark({ size = 32, className, animated = false }: { size?: number; className?: string; animated?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="-10 -3 76 76" fill="none" aria-hidden="true" className={cx("ear-mark", animated && "ear-mark-live", className)}>
      <defs>
        <linearGradient id={`ear-${id}`} x1="14" y1="6" x2="62" y2="68" gradientUnits="userSpaceOnUse">
          <stop style={{ stopColor: "var(--grad-1, #ff7440)" }} />
          <stop offset=".55" style={{ stopColor: "var(--grad-2, #b24cff)" }} />
          <stop offset="1" style={{ stopColor: "var(--grad-3, #6d62f2)" }} />
        </linearGradient>
      </defs>
      <g stroke={`url(#ear-${id})`} strokeLinecap="round" strokeLinejoin="round">
        <path d="M33 62c-5.500 0-9.500-3.600-9.500-9.200" strokeWidth="6.500" />
        <path d="M33 62c7.600 0 10.500-6 10.500-12.200 0-8.800 11-12 11-24C54.500 14.200 46.400 7 36 7 24.500 7 16.500 15 16.500 27v6" strokeWidth="6.500" />
        <path d="M29.500 31c0-5.200 3.600-8.600 8-8.600 4.300 0 7 3 7 7 0 6.600-7.600 7.300-8.800 13" strokeWidth="5" />
      </g>
      <g stroke={`url(#ear-${id})`} strokeLinecap="round" strokeWidth="4">
        <path className="ear-wave ear-wave-1" d="M9 24.500c-2.800 3.700-2.800 8.300 0 12" opacity=".95" />
        <path className="ear-wave ear-wave-2" d="M3.500 19c-5 6-5 15 0 21" opacity=".6" />
      </g>
    </svg>
  );
}

/** "EAR*" — the asterisk points to the dedication in the footer / about page. */
export function Wordmark({ className }: { className?: string }) {
  const { t } = useT();
  return (
    <bdi dir="ltr" className={cx("font-display font-extrabold tracking-tight", className)}>
      EAR<sup className="grad-text ms-0.5 text-[0.62em] font-black" title={t("common.brand.dedicationSr")} aria-hidden="true">*</sup>
      <span className="sr-only"> ({t("common.brand.dedicationSr")})</span>
    </bdi>
  );
}

export function Logo({ className, size = 30, wordmark = true }: { className?: string; size?: number; wordmark?: boolean }) {
  return (
    <span className={cx("ear-logo inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {wordmark && <Wordmark className="text-xl" />}
    </span>
  );
}
