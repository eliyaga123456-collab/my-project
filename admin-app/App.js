import { useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";

// The admin console lives on the EAR server; this app is a secure shell around it (HTTPS only, no other origins).
const ORIGIN = (process.env.EXPO_PUBLIC_API_URL || "https://ear-8ii9.onrender.com").replace(/\/+$/, "");
const URL = `${ORIGIN}/admin-ui/`;

export default function App() {
  const ref = useRef(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canBack, setCanBack] = useState(false);
  const [key, setKey] = useState(0);
  const BackSub = useRef(null);
  if (!BackSub.current) BackSub.current = BackHandler.addEventListener("hardwareBackPress", () => { if (canBack && ref.current) { ref.current.goBack(); return true; } return false; });
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      {error ? (
        <View style={s.center}>
          <Text style={s.title}>EAR Admin</Text>
          <Text style={s.msg}>Can't reach the server (it may be waking up — free hosting can take a minute).</Text>
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
          style={{ backgroundColor: "#0b0a14" }}
        />
      )}
      {loading && !error ? <View style={s.loading} pointerEvents="none"><ActivityIndicator color="#ff4fa3" size="large" /></View> : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0a14" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 12 },
  msg: { color: "#c9c4e0", textAlign: "center", marginBottom: 20 },
  btn: { backgroundColor: "#ff4fa3", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  btnText: { color: "#fff", fontWeight: "700" },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" }
});
