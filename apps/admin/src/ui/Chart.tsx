import { useMemo, useState } from "react";
import { niceScale } from "../lib/format";
import { useT } from "../i18n";

export interface Series { key: string; label: string; color: string; values: number[]; }

const W = 720, H = 260, PL = 40, PR = 12, PT = 12, PB = 28;

/** Hand-written responsive SVG line / grouped-bar chart with keyboard-focusable hover points. */
export function TimeChart({ dates, series, mode }: { dates: string[]; series: Series[]; mode: "line" | "bar" }) {
  const { t, tn, fmt, dir } = useT();
  const formatNumber = fmt.number, shortDay = fmt.shortDay;
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<number | null>(null);
  const visible = series.filter((s) => !hidden.has(s.key));
  const n = dates.length;
  const scale = useMemo(() => niceScale(Math.max(0, ...visible.flatMap((s) => s.values))), [visible]);
  const iw = W - PL - PR, ih = H - PT - PB;
  const x = (i: number) => PL + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const slot = iw / Math.max(n, 1);
  const bx = (i: number) => PL + slot * i;
  const y = (v: number) => PT + ih - (v / scale.max) * ih;
  const every = Math.max(1, Math.ceil(n / 7));
  const toggle = (k: string) => setHidden((h) => { const c = new Set(h); if (c.has(k)) c.delete(k); else if (visible.length > 1) c.add(k); return c; });
  const barW = Math.max(2, Math.min(18, (slot * 0.8) / Math.max(visible.length, 1)));

  if (n === 0) return null;
  return (
    <div className="chart">
      <div className="legend" role="group" aria-label={t("chart.series")}>
        {series.map((s) => (
          <button key={s.key} type="button" className="legend-item" aria-pressed={!hidden.has(s.key)} onClick={() => toggle(s.key)}>
            <span className="swatch" style={{ background: s.color }} aria-hidden />{s.label}
          </button>
        ))}
      </div>
      {/* the time axis is data: always left-to-right, in both languages */}
      <div className="chart-box" dir="ltr" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tn("chart.aria", n, { series: series.map((s) => s.label).join(", ") })} preserveAspectRatio="xMidYMid meet">
          {scale.ticks.map((t) => (
            <g key={t}>
              <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} className="grid" />
              <text x={PL - 8} y={y(t) + 4} textAnchor="end" className="axis">{formatNumber(t)}</text>
            </g>
          ))}
          {dates.map((d, i) => i % every === 0 ? <text key={d} x={mode === "bar" ? bx(i) + slot / 2 : x(i)} y={H - 8} textAnchor="middle" className="axis">{shortDay(d)}</text> : null)}
          {hover !== null && <line x1={mode === "bar" ? bx(hover) + slot / 2 : x(hover)} x2={mode === "bar" ? bx(hover) + slot / 2 : x(hover)} y1={PT} y2={PT + ih} className="cursor" />}
          {mode === "line"
            ? visible.map((s) => (
              <g key={s.key}>
                <polyline fill="none" stroke={s.color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
                {hover !== null && s.values[hover] !== undefined && <circle cx={x(hover)} cy={y(s.values[hover]!)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />}
              </g>
            ))
            : visible.map((s, si) => s.values.map((v, i) => (
              <rect key={`${s.key}${i}`} x={bx(i) + slot / 2 - (barW * visible.length) / 2 + si * barW} y={y(v)} width={Math.max(1, barW - 1)} height={Math.max(0, PT + ih - y(v))} rx={2} fill={s.color} opacity={hover === null || hover === i ? 1 : 0.45} />
            )))}
          {dates.map((d, i) => (
            <rect
              key={`hit${d}`} x={mode === "bar" ? bx(i) : x(i) - (n <= 1 ? iw : iw / (n - 1)) / 2} y={PT} width={mode === "bar" ? slot : n <= 1 ? iw : iw / (n - 1)} height={ih}
              fill="transparent" tabIndex={0} aria-label={`${shortDay(d)}: ${visible.map((s) => `${s.label} ${formatNumber(s.values[i] ?? 0)}`).join(", ")}`}
              onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
            />
          ))}
        </svg>
        {hover !== null && (
          <div className="tooltip" style={{ left: `${(((mode === "bar" ? bx(hover) + slot / 2 : x(hover)) / W) * 100).toFixed(1)}%` }} role="presentation" dir={dir}>
            <strong>{shortDay(dates[hover]!)}</strong>
            {visible.map((s) => <div key={s.key}><span className="swatch" style={{ background: s.color }} aria-hidden /> {s.label}: {formatNumber(s.values[hover] ?? 0)}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
