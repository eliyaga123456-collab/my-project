import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { getLocales } from "expo-localization";
import { fallbackStrings } from "@/lib/fallbackText";

/**
 * expo-router ErrorBoundary body. Deliberately uses plain React Native components only (no theme / i18n / auth providers,
 * which may be the very thing that crashed) with safe fallbacks for language and colour scheme.
 */
export function CrashScreen({ error, retry }: { error: Error; retry: () => void | Promise<void> }) {
  const scheme = useColorScheme();
  const s = useMemo(() => {
    let code: string | null | undefined;
    try { code = getLocales()[0]?.languageCode; } catch { code = null; }
    return fallbackStrings(code);
  }, []);
  const dark = scheme !== "light";
  const bg = dark ? "#0b0a14" : "#faf8ff";
  const fg = dark ? "#f6f4ff" : "#15121f";
  const muted = dark ? "#a8a3c2" : "#5d5878";
  if (typeof __DEV__ !== "undefined" && __DEV__) console.warn("[EAR] ErrorBoundary caught", error);
  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: fg }]} accessibilityRole="header">{s.title}</Text>
      <Text style={[styles.body, { color: muted }]}>{s.body}</Text>
      {typeof __DEV__ !== "undefined" && __DEV__ ? <Text style={[styles.dev, { color: muted }]} selectable>{String(error?.message ?? error)}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={s.retry} onPress={() => { void Promise.resolve(retry()).catch(() => undefined); }} style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.8 : 1 }]}>
        <Text style={styles.btnText}>{s.retry}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 14 },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  body: { fontSize: 16, lineHeight: 24, textAlign: "center" },
  dev: { fontSize: 12, textAlign: "center" },
  btn: { marginTop: 8, minHeight: 52, minWidth: 180, paddingHorizontal: 28, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "#ff7440" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" }
});
