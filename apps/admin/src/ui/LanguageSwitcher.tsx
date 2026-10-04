import { client } from "../lib/client";
import { useAuth } from "../auth";
import { useT } from "../i18n";

/** English | עברית segmented switch. Persists to the account when signed in (best effort). */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, locales, localeNames, t } = useT();
  const { phase } = useAuth();
  return (
    <div className={`lang-switch ${className}`} role="group" aria-label={t("lang.label")}>
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          dir={l === "he" ? "rtl" : "ltr"}
          className="lang-btn"
          aria-pressed={l === locale}
          onClick={() => {
            if (l === locale) return;
            setLocale(l);
            if (phase === "ready") void client.settings.update({ locale: l }).catch(() => undefined);
          }}
        >{localeNames[l]}</button>
      ))}
    </div>
  );
}
