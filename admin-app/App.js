import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, BackHandler, Easing, Linking, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";
import { WebView } from "react-native-webview";

// The admin console lives on the EAR server; this app is a secure shell around it (HTTPS only, no other origins).
const ORIGIN = (process.env.EXPO_PUBLIC_API_URL || "https://ear-8ii9.onrender.com").replace(/\/+$/, "");
const URL = `${ORIGIN}/admin-ui/`;
const REPO = Constants.expoConfig?.extra?.updateRepo || "eliyaga123456-collab/my-project";
const BUILD = Number(Constants.expoConfig?.android?.versionCode) || 0;
const APK = `https://github.com/${REPO}/releases/download/admin-apk/EAR-Admin.apk`;
const PINK = "#ff4fa3", VIOLET = "#9b5cff", EMBER = "#ff7440", BG = "#0b0a14";

/** Animated brand splash: glowing rings + title, then it lifts away. */
function Splash({ onDone }) {
  const a = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1600, easing: Easing.out(Easing.cubic), useNativeDriver: true })).start();
    Animated.timing(a, { toValue: 1, duration: 800, easing: Easing.out(Easing.back(1.8)), useNativeDriver: true }).start();
    const t = setTimeout(() => Animated.timing(out, { toValue: 1, duration: 450, useNativeDriver: true }).start(onDone), 1900);
    return () => clearTimeout(t);
  }, [a, ring, out, onDone]);
  const R = (d) => ({ opacity: Animated.multiply(ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), 1), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.4 + d, 2.2 + d] }) }] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.splash, { opacity: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }] }]}>
      <LinearGradient colors={["#1a0f2e", BG, "#2a0f22"]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[s.ring, { borderColor: PINK }, R(0)]} />
      <Animated.View style={[s.ring, { borderColor: VIOLET }, R(0.25)]} />
      <Animated.View style={[s.ring, { borderColor: EMBER }, R(0.5)]} />
      <Animated.View style={{ opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }}>
        <Text style={s.logo}>EAR<Text style={{ color: EMBER }}>*</Text></Text>
        <Text style={s.sub}>ADMIN</Text>
      </Animated.View>
    </Animated.View>
  );
}

async function latestBuild() {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/admin-apk`, { headers: { accept: "application/vnd.github+json" } });
    if (!r.ok) return null;
    const j = await r.json();
    const m = /build (\d+)/.exec(String(j?.name ?? ""));
    return m ? Number(m[1]) : null;
  } catch { return null; }
}

async function installUpdate(setPct) {
  try {
    const FS = await import("expo-file-system/legacy");
    const IL = await import("expo-intent-launcher");
    const dest = `${FS.cacheDirectory}EAR-Admin-update.apk`;
    await FS.deleteAsync(dest, { idempotent: true });
    const task = FS.createDownloadResumable(APK, dest, {}, (p) => { if (p.totalBytesExpectedToWrite > 0) setPct(p.totalBytesWritten / p.totalBytesExpectedToWrite); });
    const res = await task.downloadAsync();
    if (!res || res.status !== 200) throw new Error("download");
    const uri = await FS.getContentUriAsync(res.uri);
    try { await IL.startActivityAsync("android.intent.action.VIEW", { data: uri, flags: 1, type: "application/vnd.android.package-archive" }); }
    catch { await IL.startActivityAsync(IL.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, { data: "package:app.ear.admin" }); }
  } catch { await Linking.openURL(APK).catch(() => undefined); }
}

export default function App() {
  const ref = useRef(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canBack, setCanBack] = useState(false);
  const [key, setKey] = useState(0);
  const [splash, setSplash] = useState(true);
  const [latest, setLatest] = useState(null);
  const [pct, setPct] = useState(null);
  const done = useCallback(() => setSplash(false), []);
  const canBackRef = useRef(false);
  canBackRef.current = canBack;
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { if (canBackRef.current && ref.current) { ref.current.goBack(); return true; } return false; });
    return () => sub.remove();
  }, []);
  const check = useCallback(() => { void latestBuild().then(setLatest); }, []);
  useEffect(check, [check]);
  const hasUpdate = latest !== null && latest > BUILD;
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <View style={s.bar}>
        <Text style={s.barTitle}>EAR<Text style={{ color: EMBER }}>*</Text> <Text style={s.barSub}>admin</Text></Text>
        <Pressable onPress={check} hitSlop={10}><Text style={s.ver}>v{BUILD} · {latest === null ? "↻" : hasUpdate ? "update" : "up to date"}</Text></Pressable>
      </View>
      {hasUpdate ? (
        <Pressable style={s.update} onPress={() => void installUpdate(setPct)}>
          <LinearGradient colors={[VIOLET, PINK, EMBER]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.updateIn}>
            <Text style={s.updateText}>{pct === null ? `New version available (build ${latest}) — tap to update` : `Downloading… ${Math.round(pct * 100)}%`}</Text>
          </LinearGradient>
        </Pressable>
      ) : null}
      {error ? (
        <View style={s.center}>
          <Text style={s.title}>Can't reach the server</Text>
          <Text style={s.msg}>Free hosting can take up to a minute to wake up.</Text>
          <Pressable style={s.btn} onPress={() => { setError(false); setLoading(true); setKey((k) => k + 1); }}><Text style={s.btnText}>Try again</Text></Pressable>
        </View>
      ) : (
        <WebView
          key={key}
          ref={ref}
          source={{ uri: URL }}
          originWhitelist={[ORIGIN]}
          onShouldStartLoadWithRequest={(r) => r.url.startsWith(ORIGIN)}
          onNavigationStateChange={(n) => setCanBack(n.canGoBack)}
          onLoadEnd={() => setLoading(false)}
          onError={() => setError(true)}
          onHttpError={(e) => { if (e.nativeEvent.statusCode >= 500) setError(true); }}
          setSupportMultipleWindows={false}
          allowFileAccess={false}
          javaScriptCanOpenWindowsAutomatically={false}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled={false}
          style={{ backgroundColor: BG }}
        />
      )}
      {loading && !error && !splash ? <View style={s.loading} pointerEvents="none"><ActivityIndicator color={PINK} size="large" /></View> : null}
      {splash ? <Splash onDone={done} /> : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#2c2745" },
  barTitle: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 0.5 },
  barSub: { color: PINK, fontSize: 13, fontWeight: "600", textTransform: "uppercase" },
  ver: { color: "#a8a3c2", fontSize: 12 },
  update: { marginHorizontal: 12, marginTop: 8, borderRadius: 14, overflow: "hidden" },
  updateIn: { paddingVertical: 12, paddingHorizontal: 14 },
  updateText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 10 },
  msg: { color: "#c9c4e0", textAlign: "center", marginBottom: 20 },
  btn: { backgroundColor: PINK, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  btnText: { color: "#fff", fontWeight: "700" },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  splash: { alignItems: "center", justifyContent: "center", zIndex: 99 },
  ring: { position: "absolute", width: 220, height: 220, borderRadius: 110, borderWidth: 2.5 },
  logo: { color: "#fff", fontSize: 64, fontWeight: "900", letterSpacing: 2, textAlign: "center", textShadowColor: PINK, textShadowRadius: 24 },
  sub: { color: PINK, fontSize: 16, letterSpacing: 10, textAlign: "center", marginTop: 4, fontWeight: "700" }
});
