import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { haptic } from "@/lib/haptics";
import { Icon } from "./Icon";
import { Text } from "./Text";

type Kind = "success" | "error" | "info";
interface ToastApi { show: (message: string, kind?: Kind) => void }
const ToastContext = createContext<ToastApi>({ show: () => undefined });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ id: number; message: string; kind: Kind } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((message: string, kind: Kind = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, kind });
    if (kind === "success") haptic.success(); else if (kind === "error") haptic.error();
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  const api = useMemo(() => ({ show }), [show]);
  const tint = toast?.kind === "success" ? colors.success : toast?.kind === "error" ? colors.danger : colors.secondary;
  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.id}
          entering={FadeInDown.duration(220)}
          exiting={FadeOut.duration(160)}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{ position: "absolute", left: 16, right: 16, top: insets.top + 8 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: radii.md, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: tint }}>
            <Icon name={toast.kind === "error" ? "flag" : "check"} size={18} color={tint} />
            <Text variant="bodyStrong" style={{ flex: 1, fontSize: 14 }}>{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}
