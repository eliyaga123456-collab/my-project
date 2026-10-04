"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Languages } from "lucide-react";
import { LOCALES, LOCALE_NAMES, type Locale } from "@unsaid/shared";
import { api } from "@/lib/api";
import { LOCALE_COOKIE } from "@/i18n/config";
import { useT } from "@/i18n/client";
import { cx } from "@/components/ui";

/** Switches the interface language: sets the cookie, saves it on the account when signed in, re-renders server components. */
export function LanguageSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { locale, t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [announce, setAnnounce] = useState("");

  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setAnnounce(LOCALE_NAMES[next]);
    // Best effort: remember the choice for emails/notifications when signed in (401 for visitors is expected).
    void api.settings.update({ locale: next }).catch(() => undefined);
    start(() => router.refresh());
  }

  return (
    <div role="group" aria-label={t("common.language.switchTo")} className={cx("inline-flex items-center gap-1 rounded-full border border-line p-0.5 text-sm font-semibold", pending && "opacity-70", className)}>
      {!compact && <Languages className="mx-1.5 size-4 text-muted" aria-hidden />}
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          onClick={() => choose(l)}
          className={cx("min-h-9 rounded-full px-3 transition", l === locale ? "bg-primary text-on-primary" : "text-muted hover:bg-raised hover:text-fg")}
        >
          {LOCALE_NAMES[l]}
        </button>
      ))}
      <span className="sr-only" role="status" aria-live="polite">{announce}</span>
    </div>
  );
}
