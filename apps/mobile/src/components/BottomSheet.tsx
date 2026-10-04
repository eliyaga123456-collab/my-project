import { useEffect, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { Text } from "./Text";
import { IconButton } from "./IconButton";

interface Props { visible: boolean; onClose: () => void; title?: string; children: ReactNode }

export function BottomSheet({ visible, onClose, title, children }: Props) {
  const { colors, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const p = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      p.value = reduce ? 1 : withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      p.value = reduce ? 0 : withTiming(0, { duration: 180 }, (done) => { if (done) runOnJS(setMounted)(false); });
      if (reduce) setMounted(false);
    }
  }, [visible, reduce, mounted, p]);

  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * 360 }], opacity: 0.2 + 0.8 * p.value }));
  const backdrop = useAnimatedStyle(() => ({ opacity: p.value }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(5,4,12,0.62)" }, backdrop]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Animated.View
            accessibilityViewIsModal
            style={[{ backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingTop: 10, paddingHorizontal: 20, paddingBottom: insets.bottom + 16, maxHeight: "88%", borderWidth: 1, borderColor: colors.border }, sheet]}
          >
            <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 8 }} />
            {title ? (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text variant="heading" style={{ flex: 1 }}>{title}</Text>
                <IconButton icon="close" label="Close" onPress={onClose} />
              </View>
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>{children}</ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
