import { View } from "react-native";
import { LOCALES, LOCALE_NAMES } from "@unsaid/shared";
import { useT, type Locale } from "@/i18n";
import { Chips } from "./Chips";

/** English | עברית radio group. Selecting persists locally, syncs to the server when signed in, and may ask for a restart (direction change). */
export function LanguagePicker({ align = "start" }: { align?: "start" | "end" }) {
  const { locale, setLocale, t } = useT();
  return (
    <View style={{ alignSelf: align === "end" ? "flex-end" : "flex-start" }} accessibilityHint={t("language.hint")}>
      <Chips<Locale> label={t("language.group")} value={locale} onChange={(l) => setLocale(l)} options={LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] }))} />
    </View>
  );
}
