import { useMemo, useRef, useState } from "react";
import { PanResponder, View } from "react-native";

/** Minimal horizontal slider (value 0..1). Always laid out left-to-right so the thumb follows the finger in RTL too. */
export function SimpleSlider({ value, onChange, label, color = "#ff4fa3", track = "rgba(255,255,255,0.22)" }: { value: number; onChange: (v: number) => void; label: string; color?: string; track?: string }) {
  const [w, setW] = useState(0);
  const wRef = useRef(0);
  const cb = useRef(onChange);
  cb.current = onChange;
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { if (wRef.current > 0) cb.current(Math.min(1, Math.max(0, e.nativeEvent.locationX / wRef.current))); },
    onPanResponderMove: (e) => { if (wRef.current > 0) cb.current(Math.min(1, Math.max(0, e.nativeEvent.locationX / wRef.current))); }
  }), []);
  const v = Math.min(1, Math.max(0, value));
  return (
    <View
      accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => onChange(Math.min(1, Math.max(0, v + (e.nativeEvent.actionName === "increment" ? 0.1 : -0.1))))}
      onLayout={(e) => { wRef.current = e.nativeEvent.layout.width; setW(e.nativeEvent.layout.width); }}
      style={{ height: 40, justifyContent: "center", direction: "ltr", flex: 1 }} {...pan.panHandlers}
    >
      <View pointerEvents="none" style={{ height: 6, borderRadius: 3, backgroundColor: track }}>
        <View style={{ width: `${v * 100}%`, height: 6, borderRadius: 3, backgroundColor: color }} />
      </View>
      <View pointerEvents="none" style={{ position: "absolute", left: Math.max(0, v * w - 11), width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", borderWidth: 3, borderColor: color }} />
    </View>
  );
}
