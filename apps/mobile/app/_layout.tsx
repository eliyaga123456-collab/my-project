import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { BricolageGrotesque_600SemiBold } from "@expo-google-fonts/bricolage-grotesque/600SemiBold";
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Heebo_400Regular } from "@expo-google-fonts/heebo/400Regular";
import { Heebo_500Medium } from "@expo-google-fonts/heebo/500Medium";
import { Heebo_600SemiBold } from "@expo-google-fonts/heebo/600SemiBold";
import { Heebo_700Bold } from "@expo-google-fonts/heebo/700Bold";
import { ThemeProvider, useTheme } from "@/theme";
import { I18nProvider } from "@/i18n";
import { LocaleSync } from "@/i18n/LocaleSync";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { NetworkProvider } from "@/providers/NetworkProvider";
import { ToastProvider } from "@/components/Toast";
import { routeForNotificationData } from "@/lib/push";
import { CrashScreen } from "@/components/AppErrorBoundary";
import { BootScreen } from "@/components/BootScreen";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { installGlobalErrorHandler } from "@/lib/globalErrors";

installGlobalErrorHandler();

/** expo-router renders this when any screen below the root layout throws while rendering. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return <CrashScreen error={error} retry={retry} />;
}

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Gate() {
  const { status, bootFailed, retryBoot } = useAuth();
  const { colors, name } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  // Auth-guarded routing. Public viewer screens (u/, l/) are open to everyone.
  useEffect(() => {
    if (status === "loading") return;
    const top = segments[0] as string | undefined;
    const inAuth = top === "(auth)";
    const isPublic = top === "u" || top === "l";
    if (status === "anon" && !inAuth && !isPublic) router.replace("/welcome");
    else if (status === "authed" && (inAuth || top === undefined)) router.replace("/inbox");
  }, [status, segments, router]);

  // Push taps open the message.
  useEffect(() => {
    if (status !== "authed") return;
    const open = (data: Record<string, unknown> | null | undefined) => {
      const href = routeForNotificationData(data);
      if (href) { try { router.push(href as never); } catch { /* navigator not ready */ } }
    };
    let sub: { remove: () => void } | null = null;
    try {
      const last = Notifications.getLastNotificationResponse();
      if (last) open(last.notification.request.content.data);
      sub = Notifications.addNotificationResponseReceivedListener((r) => open(r?.notification?.request?.content?.data));
    } catch { /* notifications unavailable */ }
    return () => { try { sub?.remove(); } catch { /* ignore */ } };
  }, [status, router]);

  // The boot screen (below) covers the "restoring session" wait, so the splash can go as soon as the app shell is mounted.
  useEffect(() => { SplashScreen.hideAsync().catch(() => undefined); }, []);

  return (
    <>
      <LocaleSync />
      <StatusBar style={name === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "fade" }}>
        <Stack.Screen name="message/[id]" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      </Stack>
      {status === "loading" ? <BootScreen failed={bootFailed} onRetry={retryBoot} /> : null}
      <AnimatedSplash />
    </>
  );
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts({ BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Heebo_400Regular, Heebo_500Medium, Heebo_600SemiBold, Heebo_700Bold });
  // Splash stays up until fonts are ready (no flash of unstyled/white content).
  if (!loaded && !fontError) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0b0a14" }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <NetworkProvider>
              <ToastProvider>
                <AuthProvider>
                  <Gate />
                </AuthProvider>
              </ToastProvider>
            </NetworkProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
