import { View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { InkIn } from "@/theme/motion";
import { useTheme } from "@/theme";
import { brand as brandCopy } from "@unsaid/tokens";

export default function Welcome() {
  const router = useRouter();
  const { brand } = useTheme();
  return (
    <Screen scroll={false} contentStyle={{ justifyContent: "space-between" }}>
      <InkIn style={{ marginTop: 48, gap: 20 }}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 88, height: 88, borderRadius: 44, overflow: "hidden" }}>
          <LinearGradient colors={[brand.gradient[0], brand.gradient[1], brand.gradient[2]]} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        </View>
        <View accessible accessibilityLabel={`${brandCopy.name}, ${brandCopy.fullName}. ${brandCopy.dedicationSr}`}>
          <Text variant="display" style={{ fontSize: 56, lineHeight: 60 }}>EAR<Text variant="display" tone="primary" style={{ fontSize: 28, lineHeight: 36 }}>*</Text></Text>
          <Text tone="muted" style={{ fontSize: 14, letterSpacing: 0.3 }}>{brandCopy.fullName}</Text>
        </View>
        <Text variant="display" style={{ fontSize: 40, lineHeight: 44 }}>Say what you{"\n"}really think.</Text>
        <Text tone="muted" style={{ fontSize: 18, lineHeight: 27 }}>
          Share your link, get anonymous messages, and answer the ones worth answering. Nothing's traced back to the sender — but be kind.
        </Text>
      </InkIn>
      <InkIn delay={120} style={{ gap: 12 }}>
        <Button title="Create my link" onPress={() => router.push("/signup")} />
        <Button title="I already have an account" variant="ghost" onPress={() => router.push("/login")} />
        <Text variant="caption" tone="muted" style={{ textAlign: "center" }} accessibilityLabel={brandCopy.dedicationSr}>{brandCopy.dedication}</Text>
      </InkIn>
    </Screen>
  );
}
