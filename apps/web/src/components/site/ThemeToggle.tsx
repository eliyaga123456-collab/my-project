"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { IconButton } from "@/components/ui";
import { useT } from "@/i18n/client";

type Mode = "system" | "light" | "dark";

function read(): Mode {
  try {
    const t = localStorage.getItem("unsaid-theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch { return "system"; }
}

export function ThemeToggle() {
  const { t } = useT();
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => setMode(read()), []);

  const cycle = () => {
    const next: Mode = mode === "system" ? "light" : mode === "light" ? "dark" : "system";
    setMode(next);
    try {
      if (next === "system") { localStorage.removeItem("unsaid-theme"); document.documentElement.removeAttribute("data-theme"); }
      else { localStorage.setItem("unsaid-theme", next); document.documentElement.setAttribute("data-theme", next); }
    } catch { /* storage blocked: still apply for this page */ document.documentElement.setAttribute("data-theme", next === "system" ? "dark" : next); }
  };

  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : SunMoon;
  return (
    <IconButton label={t("common.theme.label", { mode: t(`common.theme.${mode}`) })} onClick={cycle}>
      <Icon className="size-5" aria-hidden />
    </IconButton>
  );
}
