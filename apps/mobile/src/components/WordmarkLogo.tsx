import { Image, type StyleProp, type ImageStyle } from "react-native";
import { useTheme } from "@/theme";

const DARK = require("../../assets/ear-wordmark.png");
const LIGHT = require("../../assets/ear-wordmark-light.png");
const RATIO_DARK = 720 / 489;
const RATIO_LIGHT = 720 / 504;

/** The glossy EAR wordmark: the dark-theme PNG on dark, the light-theme PNG on light (both transparent). */
export function WordmarkLogo({ width = 240, style, theme }: { width?: number; style?: StyleProp<ImageStyle>; theme?: "dark" | "light" }) {
  const { name } = useTheme();
  const mode = theme ?? name;
  return <Image source={mode === "light" ? LIGHT : DARK} accessibilityLabel="EAR" accessibilityRole="image" resizeMode="contain" style={[{ width, height: width / (mode === "light" ? RATIO_LIGHT : RATIO_DARK) }, style]} />;
}
