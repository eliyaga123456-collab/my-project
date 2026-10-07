import { useEffect, useRef, useState } from "react";
import { Image, Modal, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Defs, Mask, Rect, Circle } from "react-native-svg";
import { captureRef } from "react-native-view-shot";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Text } from "./Text";
import { SimpleSlider } from "./SimpleSlider";
import { clampOffset, clampScale, coverSize, fractionToZoom, zoomToFraction } from "@/lib/cropMath";

/** Free circular crop: pan + pinch (or +/- buttons) the photo inside a circular mask; the visible square is captured as a PNG. */
export function AvatarCropModal({ uri, width, height, onCancel, onDone }: { uri: string | null; width: number; height: number; onCancel: () => void; onDone: (pngUri: string) => void }) {
  const { t } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const CROP = Math.min(win.width - 32, 380);
  const [dims, setDims] = useState({ w: width, h: height });
  useEffect(() => {
    setDims({ w: width, h: height });
    // Fall back to the real pixel size when the picker did not report one.
    if (uri && (!(width > 0) || !(height > 0))) Image.getSize(uri, (w, h) => setDims({ w, h }), () => setDims({ w: 1000, h: 1000 }));
  }, [uri, width, height]);
  const { iw, ih } = coverSize(dims.w, dims.h, CROP);
  const shot = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);

  const [zoomUi, setZoomUi] = useState(1);
  useAnimatedReaction(() => Math.round(scale.value * 50) / 50, (v, prev) => { if (v !== prev) runOnJS(setZoomUi)(v); });
  const reset = () => { scale.value = 1; tx.value = 0; ty.value = 0; };
  useEffect(() => { if (uri) reset(); }, [uri]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = Gesture.Pan()
    .minDistance(0)
    .onStart(() => { sx.value = tx.value; sy.value = ty.value; })
    .onUpdate((e) => {
      const c = clampOffset(sx.value + e.translationX, sy.value + e.translationY, iw, ih, scale.value, CROP);
      tx.value = c.x; ty.value = c.y;
    });
  const pinch = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate((e) => {
      const s = clampScale(savedScale.value * e.scale);
      scale.value = s;
      const c = clampOffset(tx.value, ty.value, iw, ih, s, CROP);
      tx.value = c.x; ty.value = c.y;
    });
  const gesture = Gesture.Simultaneous(pan, pinch);
  const imgStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }] }));

  const setZoom = (s0: number, animate: boolean) => {
    const s = clampScale(s0);
    const c = clampOffset(tx.value, ty.value, iw, ih, s, CROP);
    if (animate) {
      scale.value = withTiming(s, { duration: 160, easing: Easing.out(Easing.cubic) });
      tx.value = withTiming(c.x, { duration: 160 }); ty.value = withTiming(c.y, { duration: 160 });
    } else { scale.value = s; tx.value = c.x; ty.value = c.y; }
  };
  const zoom = (dir: 1 | -1) => setZoom(scale.value * (dir === 1 ? 1.25 : 0.8), true);

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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, width: CROP }}>
            <IconButton icon="minus" label={t("me.crop.zoomOut")} filled onPress={() => zoom(-1)} />
            <SimpleSlider label={t("me.crop.zoom")} value={zoomToFraction(zoomUi)} onChange={(f) => setZoom(fractionToZoom(f), false)} />
            <IconButton icon="plus" label={t("me.crop.zoomIn")} filled onPress={() => zoom(1)} />
          </View>
          <Button title={t("me.crop.reset")} variant="ghost" small onPress={() => { scale.value = withTiming(1, { duration: 160 }); tx.value = withTiming(0, { duration: 160 }); ty.value = withTiming(0, { duration: 160 }); }} />
          {failed ? <Text style={{ color: colors.danger }}>{t("me.crop.failed")}</Text> : null}
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}><Button title={t("common.cancel")} variant="secondary" onPress={onCancel} disabled={busy} /></View>
          <View style={{ flex: 1.4 }}><Button title={t("me.crop.use")} onPress={() => void confirm()} loading={busy} /></View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
