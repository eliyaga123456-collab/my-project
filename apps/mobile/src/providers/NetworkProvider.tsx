import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@unsaid/api-client";
import { API_URL } from "@/lib/env";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { Text } from "@/components/Text";
import { useTheme } from "@/theme";

interface NetworkApi { offline: boolean; report: (e: unknown) => void; ok: () => void }
const NetworkContext = createContext<NetworkApi>({ offline: false, report: () => undefined, ok: () => undefined });
export const useNetwork = () => useContext(NetworkContext);

/** Tracks whether the last API calls reached the server; shows a retry banner when they did not. */
export function NetworkProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);
  const report = useCallback((e: unknown) => { if (e instanceof ApiError && e.code === "network_error") setOffline(true); }, []);
  const ok = useCallback(() => setOffline(false), []);
  const api = useMemo(() => ({ offline, report, ok }), [offline, report, ok]);

  const recheck = async () => {
    setChecking(true);
    try {
      const r = await fetch(`${API_URL}/health`);
      if (r.ok) setOffline(false);
    } catch { /* still offline */ }
    setChecking(false);
  };

  return (
    <NetworkContext.Provider value={api}>
      {children}
      {offline ? (
        <View accessibilityRole="alert" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 8, paddingTop: 10, paddingHorizontal: 16, backgroundColor: colors.surfaceRaised, borderTopWidth: 1, borderColor: colors.danger, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon name="wifi-off" size={20} tone="danger" />
          <Text variant="caption" style={{ flex: 1 }}>Can't reach EAR. Check your connection.</Text>
          <Button title="Retry" small variant="ghost" loading={checking} onPress={recheck} />
        </View>
      ) : null}
    </NetworkContext.Provider>
  );
}
