import { useEffect, useId, useRef } from "react";
import { useT } from "../i18n";

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  const { dir } = useT();
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => { const i = tabs.findIndex((x) => x.value === value); refs.current[i]?.scrollIntoView?.({ inline: "center", block: "nearest", behavior: "smooth" }); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const onKey = (e: React.KeyboardEvent, i: number) => {
    let n = i;
    const fwd = dir === "rtl" ? "ArrowLeft" : "ArrowRight", back = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
    if (e.key === fwd) n = (i + 1) % tabs.length;
    else if (e.key === back) n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[n]!.value);
    refs.current[n]?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button
          key={t.value}
          ref={(el) => { refs.current[i] = el; }}
          id={`${id}-${t.value}`}
          role="tab"
          type="button"
          aria-selected={t.value === value}
          tabIndex={t.value === value ? 0 : -1}
          className="tab"
          onClick={() => onChange(t.value)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {t.label}{t.count !== undefined && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
