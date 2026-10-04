import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { fontFamily, useTheme } from "@/theme";

type Variant = "display" | "title" | "heading" | "body" | "bodyStrong" | "caption" | "label";
const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fontFamily.display, fontSize: 36, lineHeight: 40, letterSpacing: -1.2 },
  title: { fontFamily: fontFamily.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.6 },
  heading: { fontFamily: fontFamily.displaySemi, fontSize: 19, lineHeight: 24, letterSpacing: -0.3 },
  body: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamily.bodySemi, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fontFamily.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fontFamily.bodySemi, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: "uppercase" }
};

export interface AppTextProps extends TextProps { variant?: Variant; tone?: "text" | "muted" | "primary" | "secondary" | "danger" | "success" }

export function Text({ variant = "body", tone = "text", style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return <RNText accessibilityRole={variant === "display" || variant === "title" || variant === "heading" ? "header" : undefined} {...rest} style={[variants[variant], { color: colors[tone] }, style]} />;
}
