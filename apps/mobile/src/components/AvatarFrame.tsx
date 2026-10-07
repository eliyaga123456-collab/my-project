import { useEffect, useId, type ReactNode } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from "react-native-svg";
import { AVATAR_FRAMES } from "@unsaid/shared";

export type FrameId = (typeof AVATAR_FRAMES)[number];
export const isFrameId = (v: string | null | undefined): v is FrameId => !!v && (AVATAR_FRAMES as readonly string[]).includes(v);

const GRADS: Record<string, string[]> = {
  aurora: ["#5dffd2", "#8a6cff", "#ff5fd2", "#5dffd2"],
  gold: ["#fff6bf", "#e0aa20", "#8a5a00", "#ffe27a", "#b07a10", "#fff6bf"],
  fire: ["#ffe45e", "#ff8a1a", "#e3201b", "#ff8a1a", "#ffe45e"],
  rainbow: ["#ff3b3b", "#ff9f1a", "#ffe53b", "#3bd16f", "#3ba5ff", "#8a3dff", "#ff3bd0", "#ff3b3b"],
  galaxy: ["#12063a", "#5b2bd6", "#ff4fd2", "#3aa8ff", "#12063a"],
  ice: ["#f2fdff", "#7fd6ff", "#c9efff", "#4aa8ff", "#f2fdff"]
};
const SPIN: Partial<Record<FrameId, number>> = { aurora: 5000, rainbow: 4200, fire: 3200, galaxy: 9000, gold: 7000, ice: 12000, hearts: 16000 };
const STAR = "M12 0 C12.8 7.2 16.8 11.2 24 12 C16.8 12.8 12.8 16.8 12 24 C11.2 16.8 7.2 12.8 0 12 C7.2 11.2 11.2 7.2 12 0Z";
const HEART = "M12 21 C4 14.5 2 10.5 2 7.5 A4.5 4.5 0 0 1 12 6 A4.5 4.5 0 0 1 22 7.5 C22 10.5 20 14.5 12 21Z";

/** Ring thickness for an avatar of this size. */
export const frameRing = (size: number) => Math.max(4, Math.round(size * 0.13));

/** A decorative ring AROUND the avatar (the avatar itself is `children`, rendered at `size`). The crown frame also sits above the head. */
export function AvatarFrame({ frame, size, children }: { frame: string | null | undefined; size: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);
  const id = isFrameId(frame) ? frame : null;
  useEffect(() => {
    if (reduce || !id) return;
    const ms = SPIN[id];
    if (ms) spin.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })), -1);
  }, [reduce, id, spin, pulse]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: 0.55 + pulse.value * 0.45 }));
  const twinkle = useAnimatedStyle(() => ({ opacity: 0.6 + pulse.value * 0.4 }));

  if (!id) return <>{children}</>;
  const ring = frameRing(size);
  const D = size + ring * 2;
  const c = D / 2;
  const r = c - ring / 2;
  const grad = GRADS[id];
  const gid = `g${uid}`;
  const circ = 2 * Math.PI * r;

  const gradientDefs = grad ? (
    <Defs>
      <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
        {grad.map((col, i) => <Stop key={i} offset={i / (grad.length - 1)} stopColor={col} />)}
      </LinearGradient>
    </Defs>
  ) : null;

  const ringArt = (() => {
    switch (id) {
      case "neon":
        return (
          <Svg width={D} height={D}>
            <Circle cx={c} cy={c} r={r} stroke="#ff4fa3" strokeOpacity={0.18} strokeWidth={ring * 2.4} fill="none" />
            <Circle cx={c} cy={c} r={r} stroke="#ff4fa3" strokeOpacity={0.3} strokeWidth={ring * 1.7} fill="none" />
            <Circle cx={c} cy={c} r={r} stroke="#ffd0ec" strokeWidth={ring * 0.55} fill="none" />
            <Circle cx={c} cy={c} r={r} stroke="#ff4fa3" strokeWidth={ring} strokeOpacity={0.75} fill="none" />
            <Circle cx={c} cy={c} r={r} stroke="#ffffff" strokeWidth={ring * 0.25} fill="none" />
          </Svg>
        );
      case "candy":
        return (
          <Svg width={D} height={D}>
            <Circle cx={c} cy={c} r={r} stroke="#ffffff" strokeWidth={ring} fill="none" />
            <Circle cx={c} cy={c} r={r} stroke="#ff4f9a" strokeWidth={ring} strokeDasharray={`${circ / 28} ${circ / 28}`} fill="none" />
            <Circle cx={c} cy={c} r={r - ring / 2} stroke="#ffb3d6" strokeWidth={1} fill="none" />
          </Svg>
        );
      case "hearts":
        return (
          <Svg width={D} height={D}>
            <Circle cx={c} cy={c} r={r} stroke="#ff9ac2" strokeOpacity={0.55} strokeWidth={ring * 0.5} fill="none" />
          </Svg>
        );
      case "crown":
        return (
          <Svg width={D} height={D}>
            <Circle cx={c} cy={c} r={r} stroke="#ffcf3f" strokeWidth={ring * 0.8} fill="none" />
            <Circle cx={c} cy={c} r={r} stroke="#fff3b0" strokeWidth={ring * 0.2} strokeOpacity={0.9} fill="none" />
          </Svg>
        );
      default:
        return (
          <Svg width={D} height={D}>
            {gradientDefs}
            <Circle cx={c} cy={c} r={r} stroke={`url(#${gid})`} strokeWidth={ring} fill="none" />
            {id === "gold" || id === "ice" ? <Circle cx={c} cy={c} r={r + ring * 0.42} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1} fill="none" /> : null}
            {id === "fire" ? <Circle cx={c} cy={c} r={r} stroke="#ff5a1a" strokeOpacity={0.3} strokeWidth={ring * 1.8} fill="none" /> : null}
            {id === "aurora" ? <Circle cx={c} cy={c} r={r} stroke="#5dffd2" strokeOpacity={0.22} strokeWidth={ring * 1.9} fill="none" /> : null}
          </Svg>
        );
    }
  })();

  // Decorations that sit on the ring (positions on a circle of radius r).
  const around = (n: number, draw: (x: number, y: number, i: number) => ReactNode) =>
    Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return draw(c + Math.cos(a) * r, c + Math.sin(a) * r, i); });
  const glyph = (d: string, x: number, y: number, s: number, fill: string, key: string | number, rot = 0) => (
    <G key={key} transform={`translate(${x - s / 2} ${y - s / 2}) rotate(${rot} ${s / 2} ${s / 2}) scale(${s / 24})`}><Path d={d} fill={fill} /></G>
  );

  const deco = (() => {
    switch (id) {
      case "hearts": return around(8, (x, y, i) => glyph(HEART, x, y, ring * 2.1, i % 2 ? "#ff5f9f" : "#ff2e7e", i));
      case "galaxy": return around(9, (x, y, i) => glyph(STAR, x, y, ring * (i % 3 === 0 ? 1.5 : 0.9), i % 2 ? "#ffffff" : "#ffe9a8", i));
      case "ice": return around(8, (x, y, i) => glyph("M12 0 L22 12 L12 24 L2 12Z", x, y, ring * 1.1, "#ffffff", i));
      case "gold": return around(4, (x, y, i) => glyph(STAR, x, y, ring * 1.5, "#fffbe0", i));
      default: return null;
    }
  })();

  const rotates = !!SPIN[id] && !reduce;
  return (
    <View style={{ width: D, height: D, alignItems: "center", justifyContent: "center", overflow: "visible" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ position: "absolute", width: D, height: D }, rotates ? spinStyle : null, id === "neon" ? pulseStyle : null]}>{ringArt}</Animated.View>
      {deco ? (
        <Animated.View style={[{ position: "absolute", width: D, height: D }, rotates && id !== "galaxy" && id !== "gold" ? spinStyle : null, id === "galaxy" || id === "gold" ? twinkle : null]}>
          <Svg width={D} height={D}>{deco}</Svg>
        </Animated.View>
      ) : null}
      {children}
      {id === "crown" ? (
        <Svg width={D * 0.62} height={D * 0.46} viewBox="0 0 48 36" style={{ position: "absolute", top: -D * 0.3 }}>
          <Defs>
            <LinearGradient id={`${gid}c`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#fff3b0" /><Stop offset="0.6" stopColor="#ffc928" /><Stop offset="1" stopColor="#c98a00" /></LinearGradient>
          </Defs>
          <Path d="M4 30 L2 8 L14 18 L24 4 L34 18 L46 8 L44 30 Z" fill={`url(#${gid}c)`} stroke="#8a5a00" strokeWidth={1.2} strokeLinejoin="round" />
          <Path d="M4 30 H44 V34 H4 Z" fill="#c98a00" />
          <Circle cx={24} cy={4} r={2.6} fill="#ff4fa3" /><Circle cx={2} cy={8} r={2.2} fill="#4ad0ff" /><Circle cx={46} cy={8} r={2.2} fill="#4ad0ff" />
          <Circle cx={24} cy={24} r={2.4} fill="#ff4fa3" />
        </Svg>
      ) : null}
    </View>
  );
}
