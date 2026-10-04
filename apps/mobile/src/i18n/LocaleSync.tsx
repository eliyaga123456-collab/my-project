import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { useT, isLocale } from "@/i18n";

/**
 * Keeps the app language and `settings.locale` on the server in step while signed in (the server uses it for emails and push text).
 * - The user picked a language on this device -> push it to the server.
 * - Otherwise (device default) -> adopt the language saved on the account, e.g. one chosen on the web.
 */
export function LocaleSync() {
  const { status, me, patchMe } = useAuth();
  const { locale, explicit, setLocale } = useT();
  const pushed = useRef<string | null>(null);
  const serverLocale = me?.settings.locale;

  useEffect(() => {
    if (status !== "authed" || !serverLocale || !isLocale(serverLocale) || serverLocale === locale) { if (serverLocale === locale) pushed.current = null; return; }
    if (!explicit) { setLocale(serverLocale, { explicit: false }); return; }
    if (pushed.current === locale) return; // already tried this value; don't loop on failures
    pushed.current = locale;
    api.settings.update({ locale }).then((s) => patchMe((m) => ({ ...m, settings: s })), () => { pushed.current = null; /* retried on the next change / launch */ });
  }, [status, serverLocale, locale, explicit, setLocale, patchMe]);

  return null;
}
