import { useRef, useState } from "react";
import { Image, Modal, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Defs, Mask, Rect, Circle } from "react-native-svg";
import { captureRef } from "react-native-view-shot";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Text } from "./Text";

const MAX_ZOOM = 6;

/** Free circular crop: pan + pinch (or +/- buttons) the photo inside a circular mask; the visible square is captured as a PNG. */
export function AvatarCropModal({ uri, width, height, onCancel, onDone }: { uri: string | null; width: number; height: number; onCancel: () => void; onDone: (pngUri: string) => void }) {
  const { t } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const CROP = Math.min(win.width - 32, 380);
  const w = width > 0 ? width : 1000, h = height > 0 ? height : 1000;
  const base = Math.max(CROP / w, CROP / h);
  const iw = w * base, ih = h * base;
  const shot = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);

  const pan = Gesture.Pan()
    .onStart(() => { sx.value = tx.value; sy.value = ty.value; })
    .onUpdate((e) => {
      const mx = Math.max(0, (iw * scale.value - CROP) / 2), my = Math.max(0, (ih * scale.value - CROP) / 2);
      tx.value = Math.min(mx, Math.max(-mx, sx.value + e.translationX));
      ty.value = Math.min(my, Math.max(-my, sy.value + e.translationY));
    });
  const pinch = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate((e) => {
      const s = Math.min(MAX_ZOOM, Math.max(1, savedScale.value * e.scale));
      scale.value = s;
      const mx = Math.max(0, (iw * s - CROP) / 2), my = Math.max(0, (ih * s - CROP) / 2);
      tx.value = Math.min(mx, Math.max(-mx, tx.value));
      ty.value = Math.min(my, Math.max(-my, ty.value));
    });
  const gesture = Gesture.Simultaneous(pan, pinch);
  const imgStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }] }));

  const zoom = (dir: 1 | -1) => {
    const s = Math.min(MAX_ZOOM, Math.max(1, scale.value * (dir === 1 ? 1.25 : 0.8)));
    const mx = Math.max(0, (iw * s - CROP) / 2), my = Math.max(0, (ih * s - CROP) / 2);
    scale.value = withTiming(s, { duration: 160, easing: Easing.out(Easing.cubic) });
    tx.value = withTiming(Math.min(mx, Math.max(-mx, tx.value)), { duration: 160 });
    ty.value = withTiming(Math.min(my, Math.max(-my, ty.value)), { duration: 160 });
  };

  const confirm = async () => {
    if (!shot.current) return;
    setBusy(true); setFailed(false);
    try {
      const out = await captureRef(shot, { format: "png", quality: 1, result: "tmpfile", width: 1024, height: 1024 });
      onDone(out);
    } catch { setFailed(true); }
    setBusy(false);
  };

  return (
    <Modal visible={!!uri} animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#07040e", paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="title" style={{ color: "#fff" }}>{t("me.crop.title")}</Text>
          <IconButton icon="close" label={t("common.cancel")} filled onPress={onCancel} />
        </View>
        <Text style={{ color: "#c9bde6", marginTop: 4 }}>{t("me.crop.hint")}</Text>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
          <View style={{ width: CROP, height: CROP }}>
            <View ref={shot} collapsable={false} style={{ width: CROP, height: CROP, overflow: "hidden", backgroundColor: "#000" }}>
              {uri ? (
                <GestureDetector gesture={gesture}>
                  <Animated.View style={{ width: CROP, height: CROP, alignItems: "center", justifyContent: "center" }}>
                    <Animated.View style={imgStyle}><Image source={{ uri }} style={{ width: iw, height: ih }} resizeMode="cover" /></Animated.View>
                  </Animated.View>
                </GestureDetector>
              ) : null}
            </View>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Svg width={CROP} height={CROP}>
                <Defs><Mask id="hole"><Rect width={CROP} height={CROP} fill="#fff" /><Circle cx={CROP / 2} cy={CROP / 2} r={CROP / 2 - 2} fill="#000" /></Mask></Defs>
                <Rect width={CROP} height={CROP} fill="rgba(7,4,14,0.66)" mask="url(#hole)" />
                <Circle cx={CROP / 2} cy={CROP / 2} r={CROP / 2 - 2} stroke="#ff4fa3" strokeWidth={2.5} fill="none" />
              </Svg>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 14 }}>
            <IconButton icon="minus" label={t("me.crop.zoomOut")} filled onPress={() => zoom(-1)} />
            <IconButton icon="plus" label={t("me.crop.zoomIn")} filled onPress={() => zoom(1)} />
          </View>
          {failed ? <Text style={{ color: colors.danger }}>{t("me.crop.failed")}</Text> : null}
        </View>
        <Button title={t("me.crop.use")} onPress={() => void confirm()} loading={busy} />
      </GestureHandlerRootView>
    </Modal>
  );
}
