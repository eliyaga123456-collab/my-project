import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DevSettings, I18nManager } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getLocales } from "expo-localization";
import { LOCALE_NAMES, LOCALES } from "@unsaid/shared";
import { setApiLang } from "@/lib/api";
import { setHebrewFonts } from "@/theme";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { createTranslator, isLocale, isRtlLocale, localeFromDevice, setRuntimeLocale, type Locale, type Translator } from "./core";

export * from "./core";

const STORE_KEY = "unsaid.locale";

interface Stored { locale: Locale; explicit: boolean }

/** Device language from expo-localization (he/iw -> Hebrew, everything else -> English). */
export function deviceLocale(): Locale {
  try { return localeFromDevice(getLocales()[0]?.languageCode); } catch { return "en"; }
}

async function readStored(): Promise<Stored | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Stored>;
    return isLocale(v.locale) ? { locale: v.locale, explicit: v.explicit === true } : null;
  } catch { return null; }
}
async function writeStored(s: Stored): Promise<void> {
  try { await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(s)); } catch { /* keystore unavailable: choice lasts for this session */ }
}

/** Tell React Native which direction the NEXT launch should use. The running layout only changes after a reload. */
function applyDirection(locale: Locale) {
  try {
    I18nManager.allowRTL(true);
    const want = isRtlLocale(locale);
    if (I18nManager.isRTL !== want) I18nManager.forceRTL(want);
  } catch { /* unsupported platform (web preview) */ }
}

/** Reloads the JS bundle (and with it the native layout direction) where the platform lets us. Returns false when it cannot. */
export function reloadApp(): boolean {
  if (__DEV__ && typeof DevSettings?.reload === "function") { DevSettings.reload(); return true; }
  // Release builds need expo-updates (Updates.reloadAsync) to restart in-process; it is not bundled, so the user restarts manually.
  return false;
}

export interface I18nApi extends Translator {
  setLocale: (l: Locale, opts?: { explicit?: boolean }) => void;
  /** True once the user picked a language themselves (vs. the device default). */
  explicit: boolean;
  /** The native layout direction currently in effect. It lags behind `locale` until the app is reloaded. */
  isRTL: boolean;
  /** The language itself is RTL (what the layout will be after a reload). */
  localeIsRTL: boolean;
  needsReload: boolean;
  names: Record<Locale, string>;
}

const I18nContext = createContext<I18nApi | null>(null);

export function useT(): I18nApi {
  const v = useContext(I18nContext);
  if (!v) throw new Error("useT must be used inside I18nProvider");
  return v;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored | null>(null);
  const [sheetDismissed, setSheetDismissed] = useState(false);
  const stateRef = useRef<Stored | null>(null);

  const apply = useCallback((s: Stored) => {
    stateRef.current = s;
    setRuntimeLocale(s.locale);
    setApiLang(s.locale);
    setHebrewFonts(s.locale === "he");
    applyDirection(s.locale);
    setState(s);
  }, []);

  useEffect(() => {
    let alive = true;
    void readStored().then((stored) => { if (alive) apply(stored ?? { locale: deviceLocale(), explicit: false }); });
    return () => { alive = false; };
  }, [apply]);

  const setLocale = useCallback((locale: Locale, opts?: { explicit?: boolean }) => {
    const prev = stateRef.current;
    const next: Stored = { locale, explicit: opts?.explicit ?? true };
    if (prev && prev.locale === locale && prev.explicit === next.explicit) return;
    // A direction change needs a restart: show the sheet again for it.
    if (isRtlLocale(locale) !== I18nManager.isRTL) setSheetDismissed(false);
    apply(next);
    void writeStored(next);
  }, [apply]);

  const value = useMemo<I18nApi | null>(() => {
    if (!state) return null;
    const tr = createTranslator(state.locale);
    const localeIsRTL = isRtlLocale(state.locale);
    return { ...tr, isRTL: I18nManager.isRTL, localeIsRTL, needsReload: localeIsRTL !== I18nManager.isRTL, setLocale, explicit: state.explicit, names: LOCALE_NAMES };
  }, [state, setLocale]);

  // Splash screen is still up (root layout holds it) until the stored language is read, so nothing flashes in the wrong language.
  if (!value) return null;
  const canReload = __DEV__ && typeof DevSettings?.reload === "function";
  return (
    <I18nContext.Provider value={value}>
      {children}
      <BottomSheet visible={value.needsReload && !sheetDismissed} onClose={() => setSheetDismissed(true)} title={value.t("language.restartTitle")}>
        <Text tone="muted">{value.t(canReload ? "language.restartBody" : "language.restartBodyManual", { name: LOCALE_NAMES[value.locale] })}</Text>
        {canReload ? <Button title={value.t("language.restartNow")} onPress={() => { reloadApp(); }} /> : null}
        <Button title={value.t(canReload ? "language.later" : "common.gotIt")} variant={canReload ? "ghost" : "primary"} onPress={() => setSheetDismissed(true)} />
      </BottomSheet>
    </I18nContext.Provider>
  );
}

export { LOCALES };
