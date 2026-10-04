import { Image, type StyleProp, type ImageStyle } from "react-native";

const SOURCE = require("../../assets/ear-wordmark.png");
const RATIO = 720 / 489;

/** The glossy EAR wordmark (transparent PNG, works on dark and light backgrounds). */
export function WordmarkLogo({ width = 240, style }: { width?: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={SOURCE} accessibilityLabel="EAR" accessibilityRole="image" resizeMode="contain" style={[{ width, height: width / RATIO }, style]} />;
}
