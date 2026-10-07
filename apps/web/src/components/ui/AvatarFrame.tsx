import type { ReactNode } from "react";
import { AVATAR_FRAMES, type AvatarFrame as FrameId } from "@unsaid/shared";
import { cx } from "./cx";

export const isFrame = (v: unknown): v is FrameId => typeof v === "string" && (AVATAR_FRAMES as readonly string[]).includes(v);

const HEARTS = Array.from({ length: 10 }, (_, i) => i);
const SPARKS = [[8, 12], [88, 22], [14, 84], [84, 80]] as const;

/** Decorative ring around an avatar. Pure CSS/SVG; the ring sits outside the avatar box so layout is unchanged. */
export function AvatarFrame({ frame, size, children, className }: { frame?: string | null; size: number; children: ReactNode; className?: string }) {
  if (!isFrame(frame)) return <>{children}</>;
  const ring = Math.max(3, Math.round(size * 0.075));
  return (
    <span
      className={cx("afr", `afr-${frame}`, className)}
      style={{ "--afs": size, "--aft": `${ring}px`, marginTop: frame === "crown" ? Math.round(size * 0.3) : undefined } as React.CSSProperties}
      data-frame={frame}
    >
      <span className="afr-ring" aria-hidden />
      {frame === "ice" && (
        <span className="afr-deco" aria-hidden>
          {SPARKS.map(([x, y], i) => (
            <svg key={i} viewBox="0 0 20 20" className="afr-spark" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.5}s` }}><path d="M10 0l2.2 7.8L20 10l-7.8 2.2L10 20l-2.2-7.8L0 10l7.8-2.2z" fill="#e8fbff" stroke="#7dd3fc" strokeWidth=".8" /></svg>
          ))}
        </span>
      )}
      {frame === "hearts" && (
        <span className="afr-deco afr-orbit" aria-hidden>
          {HEARTS.map((i) => (
            <svg key={i} viewBox="0 0 24 24" className="afr-heart" style={{ transform: `rotate(${i * 36}deg) translateY(calc(var(--afs) * -0.5px - var(--aft) * 0.35)) rotate(${-i * 36}deg)`, animationDelay: `${i * 0.18}s` }}><path d="M12 21s-8.5-5.2-8.5-11A4.7 4.7 0 0 1 12 7.3 4.7 4.7 0 0 1 20.5 10c0 5.800-8.500 11-8.500 11z" fill={i % 2 ? "#ff7eb6" : "#ff3d8b"} /></svg>
          ))}
        </span>
      )}
      {frame === "crown" && (
        <svg viewBox="0 0 48 34" className="afr-crown-svg" aria-hidden>
          <defs><linearGradient id="afr-crown-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff3b0" /><stop offset=".5" stopColor="#ffc928" /><stop offset="1" stopColor="#c98a00" /></linearGradient></defs>
          <path d="M3 28L6 8l10 10L24 3l8 15L42 8l3 20z" fill="url(#afr-crown-g)" stroke="#9a6a00" strokeWidth="1.600" strokeLinejoin="round" />
          <rect x="3" y="28" width="42" height="4.500" rx="2" fill="#ffc928" stroke="#9a6a00" strokeWidth="1.200" />
          <circle cx="6" cy="7" r="2.400" fill="#ff4f9a" /><circle cx="24" cy="2.800" r="2.600" fill="#7dd3fc" /><circle cx="42" cy="7" r="2.400" fill="#ff4f9a" />
        </svg>
      )}
      {children}
    </span>
  );
}
