/** Tiny CSS-only confetti burst (no dependency). Spawns short-lived spans, removes them when done, skipped under reduced motion. */
const COLORS = ["#ff9a2e", "#ff2d8a", "#c26bff", "#ffd36b", "#7dd3fc", "#ff8fbd"];

export function burstConfetti(origin?: Element | null) {
  if (typeof document === "undefined") return;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = origin ?? (document.activeElement instanceof Element ? document.activeElement : null);
    const r = el?.getBoundingClientRect();
    const cx = r ? r.left + r.width / 2 : window.innerWidth / 2;
    const cy = r ? r.top + r.height / 2 : window.innerHeight / 3;
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.className = "confetti-host";
    host.style.left = `${cx}px`;
    host.style.top = `${cy}px`;
    for (let i = 0; i < 28; i++) {
      const p = document.createElement("i");
      const a = (Math.PI * 2 * i) / 28 + Math.random() * 0.5;
      const d = 60 + Math.random() * 110;
      p.style.setProperty("--dx", `${Math.cos(a) * d}px`);
      p.style.setProperty("--dy", `${Math.sin(a) * d - 40}px`);
      p.style.setProperty("--rot", `${Math.round(Math.random() * 720 - 360)}deg`);
      p.style.background = COLORS[i % COLORS.length]!;
      if (i % 3 === 0) p.style.borderRadius = "50%";
      p.style.animationDelay = `${Math.random() * 60}ms`;
      host.appendChild(p);
    }
    document.body.appendChild(host);
    window.setTimeout(() => host.remove(), 1400);
  } catch { /* decoration only */ }
}
