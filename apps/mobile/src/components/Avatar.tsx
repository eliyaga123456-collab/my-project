import { View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme";
import { initials } from "@/lib/format";
import { API_URL } from "@/lib/env";
import { Text } from "./Text";

export function resolveMediaUrl(url: string | null): string | null {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? url : `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function Avatar({ name, uri, size = 44 }: { name: string; uri?: string | null; size?: number }) {
  const { brand } = useTheme();
  const src = resolveMediaUrl(uri ?? null);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`${name} avatar`} style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
      {src ? (
        <Image source={{ uri: src }} style={{ width: size, height: size }} contentFit="cover" transition={150} />
      ) : (
        <LinearGradient colors={[brand.gradient[0], brand.gradient[1], brand.gradient[2]]} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }}>
          <Text variant="bodyStrong" style={{ color: "#fff", fontSize: size * 0.38 }}>{initials(name)}</Text>
        </LinearGradient>
      )}
    </View>
  );
}
