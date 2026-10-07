import type { ReactNode } from "react";
import { AVATAR_FRAMES, type AvatarFrame as FrameId } from "@unsaid/shared";
import { cx } from "./cx";

export const isFrame = (v: unknown): v is FrameId => typeof v === "string" && (AVATAR_FRAMES as readonly string[]).includes(v);

const HEARTS = Array.from({ length: 10 }, (_, i) => i);
const PETALS = [[10, 18, 0], [86, 14, 1], [92, 62, 2], [24, 90, 3], [60, 94, 4]] as const;
const BUBBLES = [[8, 30, 0.34], [90, 24, 0.22], [82, 84, 0.3], [14, 86, 0.2], [50, 2, 0.16]] as const;
const FLAKES = [[6, 24], [92, 34], [78, 92], [20, 88], [50, 0]] as const;
const SPARKS = [[8, 12], [88, 22], [14, 84], [84, 80]] as const;

/** Decorative ring around an avatar. Pure CSS/SVG; the ring sits outside the avatar box so layout is unchanged. */
export function AvatarFrame({ frame, size, children, className, animate = false }: { frame?: string | null; size: number; children: ReactNode; className?: string; animate?: boolean }) {
  if (!isFrame(frame)) return <>{children}</>;
  const ring = Math.max(3, Math.round(size * 0.075));
  // Reserve room for the ring, glow and crown so frames never overflow or get clipped by parents.
  const pad = Math.ceil(ring * 1.9) + 1;
  const padTop = pad + (frame === "crown" ? Math.round(size * 0.34) : frame === "diamond" ? Math.round(size * 0.24) : 0);
  return (
    <span className="afr-box" style={{ padding: `${padTop}px ${pad}px ${pad}px` }}>
    <span
      className={cx("afr", `afr-${frame}`, !animate && "afr-static", className)}
      style={{ "--afs": size, "--aft": `${ring}px` } as React.CSSProperties}
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
      {frame === "sakura" && (
        <span className="afr-deco" aria-hidden>
          {PETALS.map(([x, y, i]) => (
            <svg key={i} viewBox="0 0 20 20" className="afr-petal" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.7}s`, rotate: `${i * 62}deg` }}><path d="M10 1c4 2.600 6.500 6.300 5 10.200-1 2.600-3.200 4.300-5 7.800-1.800-3.500-4-5.200-5-7.800C3.500 7.300 6 3.600 10 1z" fill={i % 2 ? "#ffc2dc" : "#ff8fbd"} stroke="#e0508f" strokeWidth=".6" /></svg>
          ))}
        </span>
      )}
      {frame === "lightning" && (
        <span className="afr-deco" aria-hidden>
          {[[4, 22, -18], [96, 70, 160]].map(([x, y, r], i) => (
            <svg key={i} viewBox="0 0 16 24" className="afr-bolt" style={{ left: `${x}%`, top: `${y}%`, rotate: `${r}deg`, animationDelay: `${i * 0.6}s` }}><path d="M10 0L1 14h6l-2 10 10-15H9z" fill="#fff7a8" stroke="#ffb400" strokeWidth="1" strokeLinejoin="round" /></svg>
          ))}
        </span>
      )}
      {frame === "bubbles" && (
        <span className="afr-deco" aria-hidden>
          {BUBBLES.map(([x, y, d], i) => (
            <span key={i} className="afr-bubble" style={{ left: `${x}%`, top: `${y}%`, width: `calc(var(--s) * ${d})`, height: `calc(var(--s) * ${d})`, animationDelay: `${i * 0.5}s` }} />
          ))}
        </span>
      )}
      {frame === "diamond" && (
        <>
          <svg viewBox="0 0 40 34" className="afr-gem" aria-hidden>
            <defs><linearGradient id="afr-gem-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".5" stopColor="#8fe3ff" /><stop offset="1" stopColor="#6a8cff" /></linearGradient></defs>
            <path d="M8 2h24l7 9-19 21L1 11z" fill="url(#afr-gem-g)" stroke="#4a6fd8" strokeWidth="1.400" strokeLinejoin="round" />
            <path d="M1 11h38M14 11l6 21 6-21M8 2l6 9 6-9 6 9 6-9" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth=".9" />
          </svg>
          <span className="afr-deco" aria-hidden>
            {SPARKS.slice(1, 4).map(([x, y], i) => (
              <svg key={i} viewBox="0 0 20 20" className="afr-spark" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.6}s` }}><path d="M10 0l2.200 7.800L20 10l-7.800 2.200L10 20l-2.200-7.800L0 10l7.800-2.200z" fill="#fff" stroke="#8fe3ff" strokeWidth=".8" /></svg>
            ))}
          </span>
        </>
      )}
      {frame === "matrix" && (
        <span className="afr-deco afr-rain" aria-hidden>
          {[12, 30, 50, 70, 88].map((x, i) => (<i key={x} style={{ left: `${x}%`, animationDelay: `${i * 0.45}s` }} />))}
        </span>
      )}
      {frame === "snow" && (
        <span className="afr-deco" aria-hidden>
          {FLAKES.map(([x, y], i) => (
            <svg key={i} viewBox="0 0 20 20" className="afr-flake" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.6}s` }}><path d="M10 1v18M2.200 5.500l15.600 9M17.800 5.500l-15.600 9M10 4l-2.200-2M10 4l2.200-2M10 16l-2.200 2M10 16l2.200 2" stroke="#fff" strokeWidth="1.800" strokeLinecap="round" fill="none" /><circle cx="10" cy="10" r="1.800" fill="#d6f0ff" /></svg>
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
    </span>
  );
}
