import { forwardRef } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { brand, palette } from "@unsaid/tokens";
import { fontFamily } from "@/theme";
import { ltrIsolate, useT } from "@/i18n";
import { EarMark } from "./EarMark";
import { Text } from "./Text";

/** 9:16 story canvas (rendered at 270x480 and captured at 4x = 1080x1920). */
export const STORY_SIZE = { width: 270, height: 480 };

/** A designed card for ONE anonymous message, made to be screenshotted / posted as a story before replying. Always dark-brand so it looks identical in every theme. */
export const MessageStoryCard = forwardRef<View, { body: string; handleUrl: string }>(function MessageStoryCard({ body, handleUrl }, ref) {
  const { t } = useT();
  const size = body.length > 140 ? 15 : body.length > 70 ? 18 : 22;
  return (
    <View ref={ref} collapsable={false} style={{ width: STORY_SIZE.width, height: STORY_SIZE.height, overflow: "hidden", borderRadius: 26, backgroundColor: palette.ink[950] }}>
      <LinearGradient colors={[brand.gradient[0], brand.gradient[1], brand.gradient[2]]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ position: "absolute", top: 0, bottom: 0, start: 0, end: 0 }} />
      {[260, 190, 120].map((d, i) => (
        <View key={d} style={{ position: "absolute", top: 70 - d / 2 + 40, start: STORY_SIZE.width / 2 - d / 2, width: d, height: d, borderRadius: d / 2, borderWidth: 1.5, borderColor: `rgba(255,255,255,${0.1 + i * 0.05})` }} />
      ))}
      <View style={{ position: "absolute", top: 20, start: 0, end: 0, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
        <EarMark size={30} />
        <Text style={{ color: "#fff", fontFamily: fontFamily.displaySemi, fontSize: 17, letterSpacing: 1.5 }}>{ltrIsolate("EAR*")}</Text>
      </View>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 18, paddingTop: 36 }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 22, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 }}>
          <View style={{ backgroundColor: palette.ink[950], paddingVertical: 9, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#ff7440" }} />
            <Text style={{ color: "#fff", fontFamily: fontFamily.bodySemi, fontSize: 11, letterSpacing: 1.2 }}>{t("storyCard.label")}</Text>
          </View>
          <View style={{ padding: 18, minHeight: 130, justifyContent: "center" }}>
            <Text numberOfLines={9} style={{ color: palette.ink[900], fontFamily: fontFamily.displaySemi, fontSize: size, lineHeight: size * 1.3 }}>{body}</Text>
          </View>
        </View>
        <Text style={{ color: "#fff", fontFamily: fontFamily.displaySemi, fontSize: 19, textAlign: "center", marginTop: 26 }}>{t("storyCard.cta")}</Text>
        <View style={{ alignSelf: "center", marginTop: 10, backgroundColor: "rgba(0,0,0,0.28)", borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 }}>
          <Text numberOfLines={1} style={{ color: "#fff", fontFamily: fontFamily.bodySemi, fontSize: 13, writingDirection: "ltr" }}>{handleUrl.replace(/^https?:\/\//, "")}</Text>
        </View>
      </View>
    </View>
  );
});
