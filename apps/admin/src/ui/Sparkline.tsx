import { useId } from "react";

/** Tiny decorative trend line with a soft area fill; draws itself in. The numbers next to it carry the meaning. */
export function Sparkline({ values, tone = "pink", label }: { values: number[]; tone?: "pink" | "orange" | "danger"; label?: string }) {
  const id = useId().replace(/:/g, "");
  const W = 120, H = 36, P = 3;
  const v = values.length > 1 ? values : [0, ...values, ...(values.length ? [] : [0])];
  const max = Math.max(1, ...v);
  const pts = v.map((n, i) => [P + (i * (W - 2 * P)) / (v.length - 1), H - P - (n / max) * (H - 2 * P)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1]![0]} ${H} L${pts[0]![0]} ${H} Z`;
  return (
    <svg className={`spark-line tone-${tone}`} viewBox={`0 0 ${W} ${H}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} preserveAspectRatio="none" style={{ direction: "ltr" }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".35" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#${id})`} className="spark-area" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="spark-path" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
