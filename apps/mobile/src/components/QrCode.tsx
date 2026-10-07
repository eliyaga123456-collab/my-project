import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { qrMatrix } from "@/lib/qr";

/** Scannable QR on a light panel with a quiet zone. Drawn with SVG squares so it renders inside view-shot captures. */
export function QrCode({ value, size = 160, color = "#2a0f4d", background = "#ffffff", radius = 14 }: { value: string; size?: number; color?: string; background?: string; radius?: number }) {
  const m = useMemo(() => { try { return qrMatrix(value); } catch { return null; } }, [value]);
  if (!m) return null;
  const quiet = 4;
  const total = m.length + quiet * 2;
  const rects: React.ReactNode[] = [];
  m.forEach((row, y) => row.forEach((on, x) => { if (on) rects.push(<Rect key={`${x}-${y}`} x={x + quiet} y={y + quiet} width={1.02} height={1.02} fill={color} />); }));
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="QR" style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", backgroundColor: background }}>
      <Svg width={size} height={size} viewBox={`0 0 ${total} ${total}`}>{rects}</Svg>
    </View>
  );
}
