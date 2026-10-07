import { forwardRef } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { brand, palette } from "@unsaid/tokens";
import { fontFamily } from "@/theme";
import { useT } from "@/i18n";
import { EarMark } from "./EarMark";
import { QrCode } from "./QrCode";
import { Text } from "./Text";
import { WordmarkLogo } from "./WordmarkLogo";

/** Square post canvas (rendered at 300x300 and captured at 3.6x = 1080x1080). */
export const SQUARE_SIZE = { width: 300, height: 300 };

const SPARKS: { top: number; start: number; size: number; o: number }[] = [
  { top: 54, start: 22, size: 16, o: 0.9 }, { top: 96, start: 262, size: 11, o: 0.7 }, { top: 232, start: 30, size: 10, o: 0.6 }, { top: 250, start: 252, size: 15, o: 0.85 }
];

/** One anonymous message as a square card: the question in the middle of a framed panel, brand artwork around it. Always dark-brand so it looks identical in every theme. */
export const MessageSquareCard = forwardRef<View, { body: string; handleUrl: string }>(function MessageSquareCard({ body, handleUrl }, ref) {
  const { t } = useT();
  const size = body.length > 150 ? 13 : body.length > 90 ? 15 : body.length > 45 ? 18 : 22;
  return (
    <View ref={ref} collapsable={false} style={{ width: SQUARE_SIZE.width, height: SQUARE_SIZE.height, overflow: "hidden", borderRadius: 24, backgroundColor: palette.ink[950] }}>
      <LinearGradient colors={[brand.gradient[0], brand.gradient[1], brand.gradient[2]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", top: 0, bottom: 0, start: 0, end: 0 }} />
      {[300, 230, 160].map((d, i) => (
        <View key={d} style={{ position: "absolute", top: 150 - d / 2, start: 150 - d / 2, width: d, height: d, borderRadius: d / 2, borderWidth: 1.5, borderColor: `rgba(255,255,255,${0.1 + i * 0.05})` }} />
      ))}
      {SPARKS.map((s, i) => (
        <Text key={i} style={{ position: "absolute", top: s.top, start: s.start, color: "#fff", opacity: s.o, fontSize: s.size, lineHeight: s.size + 2 }}>✦</Text>
      ))}
      <View style={{ position: "absolute", top: 10, start: 0, end: 0, alignItems: "center" }}>
        <WordmarkLogo width={86} theme="dark" />
      </View>
      <View style={{ position: "absolute", top: 70, bottom: 66, start: 22, end: 22, justifyContent: "center" }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}>
          <View style={{ backgroundColor: palette.ink[950], paddingVertical: 7, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 7 }}>
            <EarMark size={18} />
            <Text style={{ color: "#fff", fontFamily: fontFamily.bodySemi, fontSize: 10, letterSpacing: 1.2 }}>{t("storyCard.label")}</Text>
          </View>
          <View style={{ paddingVertical: 14, paddingHorizontal: 16, minHeight: 84, justifyContent: "center", alignItems: "center" }}>
            <Text numberOfLines={7} style={{ color: palette.ink[900], fontFamily: fontFamily.displaySemi, fontSize: size, lineHeight: size * 1.28, textAlign: "center" }}>{body}</Text>
          </View>
        </View>
      </View>
      <View style={{ position: "absolute", bottom: 8, end: 12 }}>
        <QrCode value={handleUrl} size={54} radius={8} />
      </View>
      <View style={{ position: "absolute", bottom: 12, start: 0, end: 0, alignItems: "center", gap: 4 }}>
        <Text style={{ color: "#fff", fontFamily: fontFamily.displaySemi, fontSize: 13 }}>{t("storyCard.cta")}</Text>
        <View style={{ backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 999, paddingVertical: 3, paddingHorizontal: 11 }}>
          <Text numberOfLines={1} style={{ color: "#fff", fontFamily: fontFamily.bodySemi, fontSize: 10.5, writingDirection: "ltr" }}>{handleUrl.replace(/^https?:\/\//, "")}</Text>
        </View>
      </View>
    </View>
  );
});
