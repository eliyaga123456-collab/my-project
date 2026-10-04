import { forwardRef } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { brand, palette } from "@unsaid/tokens";
import { fontFamily } from "@/theme";
import { Text } from "./Text";

export const SHARE_CARD_SIZE = { width: 320, height: 400 };

/**
 * Original share card: brand gradient field, a tilted "question slip" stamped over the answer panel.
 * Always rendered in dark brand colours so it looks identical regardless of the app theme.
 */
export const ShareCard = forwardRef<View, { question: string; answer: string; handle: string }>(function ShareCard({ question, answer, handle }, ref) {
  return (
    <View ref={ref} collapsable={false} style={{ width: SHARE_CARD_SIZE.width, height: SHARE_CARD_SIZE.height, overflow: "hidden", borderRadius: 28 }}>
      <LinearGradient colors={[brand.gradient[0], brand.gradient[1], brand.gradient[2]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ flex: 1, padding: 22, justifyContent: "space-between" }}>
        <Text style={{ color: "rgba(255,255,255,0.85)", fontFamily: fontFamily.displaySemi, fontSize: 15, letterSpacing: 1.5 }}>UNSAID</Text>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <View style={{ backgroundColor: palette.bone[50], borderRadius: 16, padding: 16, transform: [{ rotate: "-3deg" }], zIndex: 2, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
            <Text style={{ color: palette.ember[600], fontFamily: fontFamily.bodySemi, fontSize: 11, letterSpacing: 1 }}>ANONYMOUS ASKED</Text>
            <Text numberOfLines={5} style={{ color: palette.ink[900], fontFamily: fontFamily.displaySemi, fontSize: 19, lineHeight: 24, marginTop: 4 }}>{question}</Text>
          </View>
          <View style={{ backgroundColor: palette.ink[950], borderRadius: 20, paddingHorizontal: 18, paddingTop: 34, paddingBottom: 18, marginTop: -22, zIndex: 1 }}>
            <Text numberOfLines={7} style={{ color: "#f6f4ff", fontFamily: fontFamily.body, fontSize: 16, lineHeight: 23 }}>{answer}</Text>
          </View>
        </View>
        <Text style={{ color: "rgba(255,255,255,0.9)", fontFamily: fontFamily.bodySemi, fontSize: 14 }}>@{handle} · say the unsaid</Text>
      </View>
    </View>
  );
});
