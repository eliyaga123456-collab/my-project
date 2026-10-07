import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, BackHandler, Easing, Image, Linking, Pressable, SafeAreaView, StyleSheet, Text, View, useColorScheme } from "react-native";
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
// Palette taken from the logo art: dark = near-black purple + hot pink/orange glow, light = soft pink white + bubblegum pink/orange.
const DARK = { bg: "#0c0612", surface: "#1a0e27", border: "#3a1d4d", text: "#fff3fa", muted: "#c9a9c4", pink: "#ff2fa8", orange: "#ff8a1f", glowTop: "#3a0f33", glowBottom: "#2a1208", btnText: "#2a0518" };
const LIGHT = { bg: "#fff6fb", surface: "#ffffff", border: "#f3c3de", text: "#2b0f24", muted: "#7a4f70", pink: "#e8168f", orange: "#ff8a1f", glowTop: "#ffd6ec", glowBottom: "#ffe7c9", btnText: "#ffffff" };
const LOGO_DARK = require("./assets/ear-admin.png");
const LOGO_LIGHT = require("./assets/ear-admin-light.png");

/** Animated brand splash: glow + rings + sparkles around the logo, then it zooms out and away. */
function Splash({ onDone, light }) {
  const p = light ? LIGHT : DARK;
  const a = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loops = [
      Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1900, easing: Easing.out(Easing.cubic), useNativeDriver: true })),
      Animated.loop(Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ]))
    ];
    loops.forEach((l) => l.start());
    Animated.timing(a, { toValue: 1, duration: 900, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
    const t = setTimeout(() => Animated.timing(out, { toValue: 1, duration: 550, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(onDone), 2000);
    return () => { clearTimeout(t); loops.forEach((l) => l.stop()); };
  }, [a, ring, float, out, onDone]);
  // each ring runs the same loop, shifted in phase so they trail one another
  const R = (phase, color) => {
    const v = Animated.modulo(Animated.add(ring, phase), 1);
    return [s.ring, { borderColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 2.4] }) }] }];
  };
  const spark = (x, y, color, phase) => {
    const v = Animated.modulo(Animated.add(ring, phase), 1);
    return (
      <Animated.View key={`${x}${y}`} style={[s.spark, { backgroundColor: color, left: "50%", top: "50%", marginLeft: x, marginTop: y, opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }), transform: [{ rotate: "45deg" }, { scale: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1.3, 0.3] }) }] }]} />
    );
  };
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.splash, { backgroundColor: p.bg, opacity: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] }]}>
      <LinearGradient colors={[p.glowTop, p.bg, p.glowBottom]} style={StyleSheet.absoluteFill} />
      <Animated.View style={R(0, p.pink)} />
      <Animated.View style={R(0.33, p.orange)} />
      <Animated.View style={R(0.66, p.pink)} />
      {spark(-120, -110, p.orange, 0.1)}{spark(130, -80, p.pink, 0.4)}{spark(-140, 80, p.pink, 0.7)}{spark(110, 110, p.orange, 0.25)}
      <Animated.Image
        source={light ? LOGO_LIGHT : LOGO_DARK}
        resizeMode="contain"
        style={[s.splashLogo, { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }, { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ["-10deg", "0deg"] }) }, { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }] }]}
      />
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

/** Gentle breathing value 0..1 for the loading / error states. */
function usePulse() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
    ]));
    l.start();
    return () => l.stop();
  }, [v]);
  return v;
}

export default function App() {
  const light = useColorScheme() === "light";
  const p = light ? LIGHT : DARK;
  const s = useMemo(() => makeStyles(p), [p]);
  const ref = useRef(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canBack, setCanBack] = useState(false);
  const [key, setKey] = useState(0);
  const [splash, setSplash] = useState(true);
  const [latest, setLatest] = useState(null);
  const [pct, setPct] = useState(null);
  const pulse = usePulse();
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
      <StatusBar style={light ? "dark" : "light"} />
      <View style={s.bar}>
        <Image source={light ? LOGO_LIGHT : LOGO_DARK} resizeMode="contain" style={s.barLogo} accessibilityLabel="EAR admin" />
        <Pressable onPress={check} hitSlop={8} accessibilityRole="button" accessibilityLabel="Check for updates" style={s.verPill}>
          <View style={[s.dot, { backgroundColor: latest === null ? p.muted : hasUpdate ? p.orange : "#3ddc97" }]} />
          <Text style={s.ver}>v{BUILD} · {latest === null ? "Check for updates" : hasUpdate ? "Update available" : "Up to date"}</Text>
        </Pressable>
      </View>
      {hasUpdate ? (
        <Pressable style={s.update} onPress={() => void installUpdate(setPct)} accessibilityRole="button" accessibilityLabel="Install the new version">
          <LinearGradient colors={[p.pink, p.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.updateIn}>
            <Text style={s.updateText}>{pct === null ? `A new version is ready (build ${latest}). Tap to install.` : `Downloading… ${Math.round(pct * 100)}%`}</Text>
            {pct !== null ? <View style={s.track}><View style={[s.fill, { width: `${Math.round(pct * 100)}%` }]} /></View> : null}
          </LinearGradient>
        </Pressable>
      ) : null}
      {error ? (
        <View style={s.center}>
          <LinearGradient colors={[p.glowTop, p.bg, p.glowBottom]} style={StyleSheet.absoluteFill} />
          <Animated.Image source={light ? LOGO_LIGHT : LOGO_DARK} resizeMode="contain" style={[s.errLogo, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] }) }] }]} />
          <Text style={s.title} accessibilityRole="header">Can't reach the server</Text>
          <Text style={s.msg}>The server may be waking up, which can take up to a minute. Check your internet, wait a moment, then try again.</Text>
          <Pressable style={s.btnWrap} accessibilityRole="button" onPress={() => { setError(false); setLoading(true); setKey((k) => k + 1); }}>
            <LinearGradient colors={[p.pink, p.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}><Text style={s.btnText}>Try again</Text></LinearGradient>
          </Pressable>
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
          style={{ backgroundColor: p.bg }}
        />
      )}
      {loading && !error && !splash ? <View style={s.loading} pointerEvents="none">
          <Animated.Image source={light ? LOGO_LIGHT : LOGO_DARK} resizeMode="contain" style={[s.loadLogo, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] }) }] }]} />
          <ActivityIndicator color={p.pink} />
        </View> : null}
      {splash ? <Splash onDone={done} light={light} /> : null}
    </SafeAreaView>
  );
}

const makeStyles = (p) => StyleSheet.create({
  root: { flex: 1, backgroundColor: p.bg },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 4, backgroundColor: p.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.border },
  barLogo: { width: 92, height: 44 },
  verPill: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: p.border },
  dot: { width: 8, height: 8, borderRadius: 4 },
  ver: { color: p.muted, fontSize: 13, fontWeight: "700" },
  update: { marginHorizontal: 12, marginTop: 8, borderRadius: 14, overflow: "hidden" },
  updateIn: { minHeight: 56, justifyContent: "center", paddingVertical: 12, paddingHorizontal: 16 },
  updateText: { color: "#fff", fontWeight: "800", fontSize: 15, textAlign: "center", textShadowColor: "rgba(0,0,0,.25)", textShadowRadius: 2 },
  track: { height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,.35)", marginTop: 8, overflow: "hidden" },
  fill: { height: 5, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errLogo: { width: 220, height: 150, marginBottom: 12 },
  title: { color: p.text, fontSize: 24, fontWeight: "800", marginBottom: 10, textAlign: "center" },
  msg: { color: p.muted, fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 24, maxWidth: 320 },
  btnWrap: { borderRadius: 28, overflow: "hidden", minWidth: 220 },
  btn: { minHeight: 56, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 17, textShadowColor: "rgba(0,0,0,.25)", textShadowRadius: 2 },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: p.bg },
  loadLogo: { width: 180, height: 120 }
});

const s = StyleSheet.create({
  splash: { alignItems: "center", justifyContent: "center", zIndex: 99 },
  ring: { position: "absolute", width: 220, height: 220, borderRadius: 110, borderWidth: 2.5 },
  spark: { position: "absolute", width: 12, height: 12, borderRadius: 2 },
  splashLogo: { width: 280, height: 210 }
});
