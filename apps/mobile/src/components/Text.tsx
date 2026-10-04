import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { fontFamily, useTheme } from "@/theme";
import { useT } from "@/i18n";

type Variant = "display" | "title" | "heading" | "body" | "bodyStrong" | "caption" | "label";
// Built per render: the font family depends on the active language (Heebo for Hebrew).
const variants = (): Record<Variant, TextStyle> => ({
  display: { fontFamily: fontFamily.display, fontSize: 36, lineHeight: 40, letterSpacing: -1.2 },
  title: { fontFamily: fontFamily.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.6 },
  heading: { fontFamily: fontFamily.displaySemi, fontSize: 19, lineHeight: 24, letterSpacing: -0.3 },
  body: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamily.bodySemi, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fontFamily.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fontFamily.bodySemi, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: "uppercase" }
});

export interface AppTextProps extends TextProps { variant?: Variant; tone?: "text" | "muted" | "primary" | "secondary" | "danger" | "success" }

export function Text({ variant = "body", tone = "text", style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const { locale } = useT();
  const base = variants()[variant];
  // Tight tracking is a Latin display-type nicety; it makes Hebrew letters collide.
  const tracking: TextStyle | null = locale === "he" ? { letterSpacing: 0 } : null;
  // textAlign "auto" + writingDirection "auto": each paragraph aligns by its own content, so mixed Hebrew/English lines read correctly.
  return <RNText accessibilityRole={variant === "display" || variant === "title" || variant === "heading" ? "header" : undefined} {...rest} style={[base, tracking, { color: colors[tone], textAlign: "auto", writingDirection: "auto" }, style]} />;
}
