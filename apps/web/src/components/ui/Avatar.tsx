import { hueFor, initials, mediaSrc } from "@/lib/format";
import { cx } from "./cx";

export function Avatar({ name, src, size = 48, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const url = mediaSrc(src);
  const hue = hueFor(name);
  return (
    <span
      className={cx("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-bold text-white ring-2 ring-line", className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: url ? undefined : `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 60) % 360} 70% 38%))` }}
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
}
