export { ErrorBoundary } from "@/components/RouteErrorBoundary";
import { Stack } from "expo-router";
import { useTheme } from "@/theme";
import { useT } from "@/i18n";

export default function SettingsLayout() {
  const { colors } = useTheme();
  const { isRTL } = useT();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: isRTL ? "slide_from_left" : "slide_from_right" }} />;
}
