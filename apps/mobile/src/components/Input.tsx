import { forwardRef, useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { fontFamily, useTheme, withAlpha } from "@/theme";
import { Text } from "./Text";

export interface InputProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string | null;
  right?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input({ label, error, hint, right, style, onFocus, onBlur, multiline, ...rest }, ref) {
  const { colors, radii } = useTheme();
  const [focused, setFocused] = useState(false);
  const border = error ? colors.danger : focused ? colors.secondary : colors.border;
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label" tone="muted">{label}</Text>
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
          style={[{ flex: 1, color: colors.text, fontFamily: fontFamily.body, fontSize: 16, paddingHorizontal: 14, paddingVertical: multiline ? 12 : 10, minHeight: 44 }, style]}
        />
        {right}
      </View>
      {error ? <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">{error}</Text> : hint ? <Text variant="caption" tone="muted">{hint}</Text> : null}
    </View>
  );
});

export const Textarea = forwardRef<TextInput, InputProps & { max?: number }>(function Textarea({ max, value, ...rest }, ref) {
  const left = max !== undefined ? max - Array.from(value ?? "").length : null;
  return (
    <View style={{ gap: 4 }}>
      <Input ref={ref} multiline value={value} {...rest} />
      {left !== null && <Text variant="caption" tone={left < 0 ? "danger" : left < 30 ? "primary" : "muted"} style={{ textAlign: "right" }} accessibilityLabel={`${left} characters left`}>{left}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", overflow: "hidden" } });
