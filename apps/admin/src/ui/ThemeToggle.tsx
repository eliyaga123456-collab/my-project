import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/hooks";
import { useT } from "../i18n";

/** Clear two-option theme switch: Dark | Light. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, toggle] = useTheme();
  const { t } = useT();
  const pick = (want: "dark" | "light") => { if (theme !== want) toggle(); };
  return (
    <div className={`lang-switch theme-switch ${className}`} role="group" aria-label={t("nav.theme")}>
      <button type="button" className="lang-btn" aria-pressed={theme === "dark"} onClick={() => pick("dark")}><Moon size={15} aria-hidden /> {t("nav.themeDarkName")}</button>
      <button type="button" className="lang-btn" aria-pressed={theme === "light"} onClick={() => pick("light")}><Sun size={15} aria-hidden /> {t("nav.themeLightName")}</button>
    </div>
  );
}
