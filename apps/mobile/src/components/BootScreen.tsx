import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { getLocales } from "expo-localization";
import { fallbackStrings } from "@/lib/fallbackText";
import { EarMark } from "./EarMark";

/** Calm loading state while the session is restored (the server may be cold-starting). Plain RN so it never depends on other providers. */
export function BootScreen({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  const scheme = useColorScheme();
  const [slow, setSlow] = useState(false);
  useEffect(() => { const id = setTimeout(() => setSlow(true), 4000); return () => clearTimeout(id); }, []);
  const s = useMemo(() => { try { return fallbackStrings(getLocales()[0]?.languageCode); } catch { return fallbackStrings(null); } }, []);
  const dark = scheme !== "light";
  const fg = dark ? "#f6f4ff" : "#15121f";
  const muted = dark ? "#a8a3c2" : "#5d5878";
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: dark ? "#0b0a14" : "#faf8ff" }]} accessibilityLiveRegion="polite">
      <EarMark size={88} animated={!failed} />
      {failed ? null : <ActivityIndicator size="small" color="#ff7440" />}
      <Text style={[styles.title, { color: fg }]}>{s.connecting}</Text>
      {slow || failed ? <Text style={[styles.body, { color: muted }]}>{s.connectingSlow}</Text> : null}
      {failed ? (
        <Pressable accessibilityRole="button" accessibilityLabel={s.retry} onPress={onRetry} style={styles.btn}><Text style={styles.btnText}>{s.retry}</Text></Pressable>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center", padding: 28, gap: 14 },
  title: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  body: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  btn: { minHeight: 52, minWidth: 180, paddingHorizontal: 28, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "#ff7440" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" }
});
