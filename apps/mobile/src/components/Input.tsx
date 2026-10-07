import { forwardRef, useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { fontFamily, useTheme, withAlpha } from "@/theme";
import { useT } from "@/i18n";
import { Text } from "./Text";

export interface InputProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string | null;
  right?: React.ReactNode;
  /** Force left-to-right entry (email, username, URL, password): such values are always Latin even in a Hebrew UI. */
  ltr?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input({ label, error, hint, right, ltr, style, onFocus, onBlur, multiline, ...rest }, ref) {
  const { colors, radii } = useTheme();
  const [focused, setFocused] = useState(false);
  const border = error ? colors.danger : focused ? colors.secondary : colors.border;
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label" tone="muted">{label}</Text>
      <View style={{ borderRadius: radii.md, shadowColor: error ? colors.danger : colors.secondary, shadowOpacity: focused || error ? 0.35 : 0, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: focused ? 3 : 0 }}>
      <View style={[styles.row, { backgroundColor: colors.surface, borderColor: border, borderRadius: radii.md, borderWidth: focused || error ? 2 : 1, minHeight: multiline ? 112 : 52 }]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={withAlpha(colors.muted, 0.8)}
          selectionColor={colors.primary}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          {...rest}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={[{ flex: 1, color: colors.text, fontFamily: fontFamily.body, fontSize: 16, paddingHorizontal: 14, paddingVertical: multiline ? 12 : 10, minHeight: 44, textAlign: ltr ? "left" : "auto", writingDirection: ltr ? "ltr" : "auto" }, style]}
        />
        {right}
      </View>
      </View>
      {error ? <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">{error}</Text> : hint ? <Text variant="caption" tone="muted">{hint}</Text> : null}
    </View>
  );
});

export const Textarea = forwardRef<TextInput, InputProps & { max?: number }>(function Textarea({ max, value, ...rest }, ref) {
  const { t } = useT();
  const left = max !== undefined ? max - Array.from(value ?? "").length : null;
  return (
    <View style={{ gap: 4 }}>
      <Input ref={ref} multiline value={value} {...rest} />
      {left !== null && <Text variant="caption" tone={left < 0 ? "danger" : left < 30 ? "primary" : "muted"} style={{ alignSelf: "flex-end" }} accessibilityLabel={t("common.charsLeft", { count: left })}>{left}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", overflow: "hidden" } });
