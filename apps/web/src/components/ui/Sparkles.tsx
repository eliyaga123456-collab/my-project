import { cx } from "./cx";

const STARS = [
  [8, 14, 14, 0], [22, 70, 9, 1.2], [38, 8, 10, 2.1], [55, 82, 12, 0.6], [70, 18, 16, 1.7], [86, 60, 10, 0.3], [94, 12, 9, 2.6], [14, 40, 8, 3]
] as const;

/** Decorative twinkling four-point stars. Pure CSS, aria-hidden, absolutely positioned inside a relative parent. */
export function Sparkles({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cx("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      {STARS.map(([x, y, s, d], i) => (
        <svg key={i} viewBox="0 0 20 20" className="spk" style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, animationDelay: `${d}s` }}>
          <path d="M10 0l2.200 7.800L20 10l-7.800 2.200L10 20l-2.200-7.800L0 10l7.800-2.200z" fill={i % 3 === 0 ? "var(--grad-1)" : i % 3 === 1 ? "var(--grad-2)" : "var(--grad-3)"} />
        </svg>
      ))}
    </span>
  );
}
