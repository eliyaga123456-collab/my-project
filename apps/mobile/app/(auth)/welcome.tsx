import { View } from "react-native";
import { useRouter } from "expo-router";
import { AuroraBackground } from "@/components/AuroraBackground";
import { WordmarkLogo } from "@/components/WordmarkLogo";
import { Button } from "@/components/Button";
import { LanguagePicker } from "@/components/LanguagePicker";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { FloatingSparkles } from "@/components/Sparkles";
import { InkIn } from "@/theme/motion";
import { useT } from "@/i18n";

export default function Welcome() {
  const router = useRouter();
  const { t } = useT();
  const taglineLines = t("brand.tagline").split(" ");
  // Break the tagline roughly in half for the big display type (English "Say what you / really think.").
  const mid = Math.ceil(taglineLines.length / 2);
  const tagline = `${taglineLines.slice(0, mid).join(" ")}\n${taglineLines.slice(mid).join(" ")}`;
  return (
    <Screen scroll={false} aurora={false} contentStyle={{ justifyContent: "space-between" }}>
      <AuroraBackground />
      <View>
        <LanguagePicker align="end" />
        <InkIn style={{ marginTop: 28, gap: 20 }}>
        <View accessible accessibilityLabel={t("brand.wordmarkLabel")} style={{ gap: 6 }}>
          <View style={{ alignSelf: "flex-start" }}>
            <WordmarkLogo width={250} style={{ marginStart: -10 }} />
            <FloatingSparkles />
          </View>
          <Text tone="muted" style={{ fontSize: 14, letterSpacing: 0.3 }}>{t("brand.fullName")}</Text>
        </View>
        <Text variant="display" style={{ fontSize: 40, lineHeight: 44 }}>{tagline}</Text>
        <Text tone="muted" style={{ fontSize: 18, lineHeight: 27 }}>{t("welcome.intro")}</Text>
        </InkIn>
      </View>
      <InkIn delay={120} style={{ gap: 12 }}>
        <Button title={t("welcome.createLink")} onPress={() => router.push("/signup")} />
        <Button title={t("welcome.haveAccount")} variant="ghost" onPress={() => router.push("/login")} />
        <Text variant="caption" tone="muted" style={{ textAlign: "center" }} accessibilityLabel={t("brand.dedicationSr")}>{t("brand.dedication")}</Text>
      </InkIn>
    </Screen>
  );
}
