import { hueFor, initials, mediaSrc } from "@/lib/format";
import { AvatarFrame } from "./AvatarFrame";
import { cx } from "./cx";

// Brand-colored fallbacks (ember -> pink -> violet) instead of arbitrary hues.
const FALLBACKS = [["#ff7440", "#ff4f9a"], ["#ff4f9a", "#b24cff"], ["#b24cff", "#6d62f2"], ["#ff8a4c", "#e0446f"], ["#ff5d73", "#d9421a"]] as const;

export function Avatar({ name, src, size = 48, className, frame, animate }: { name: string; src?: string | null; size?: number; className?: string; frame?: string | null; animate?: boolean }) {
  const url = mediaSrc(src);
  const [from, to] = FALLBACKS[hueFor(name) % FALLBACKS.length] ?? FALLBACKS[0];
  const core = (
    <span
      className={cx("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-bold text-white ring-2 ring-line", className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: url ? undefined : `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" width={size} height={size} loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
  return frame ? <AvatarFrame frame={frame} size={size} animate={animate}>{core}</AvatarFrame> : core;
}
