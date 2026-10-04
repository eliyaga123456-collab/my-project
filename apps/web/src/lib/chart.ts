export interface Point { date: string; views: number; messages: number }

export function niceMax(v: number): number {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

export function formatDay(date: string, locale: "en" | "he" = "en"): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Builds SVG geometry for a views line and messages bars in a w x h plot area. */
export function buildChart(points: Point[], w: number, h: number) {
  const max = niceMax(Math.max(0, ...points.flatMap((p) => [p.views, p.messages])));
  const n = Math.max(points.length, 1);
  const slot = w / n;
  const y = (v: number) => h - (v / max) * h;
  const bars = points.map((p, i) => ({ x: i * slot + slot * 0.2, w: slot * 0.6, y: y(p.messages), h: h - y(p.messages), date: p.date, value: p.messages }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * slot + slot / 2).toFixed(1)},${y(p.views).toFixed(1)}`).join(" ");
  const dots = points.map((p, i) => ({ cx: i * slot + slot / 2, cy: y(p.views) }));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ y: y(max * t), label: Math.round(max * t) }));
  return { max, bars, line, dots, ticks };
}
