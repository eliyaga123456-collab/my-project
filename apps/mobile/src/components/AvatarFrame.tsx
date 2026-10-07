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
  ice: ["#f2fdff", "#7fd6ff", "#c9efff", "#4aa8ff", "#f2fdff"],
  sakura: ["#ffe3ee", "#ff9cc2", "#ffc9de", "#ff7fb0", "#ffe3ee"],
  lightning: ["#fff7a8", "#ffd21f", "#3fb6ff", "#7a5cff", "#ffd21f", "#fff7a8"],
  diamond: ["#ffffff", "#9fe8ff", "#e6f9ff", "#7fb8ff", "#ffffff", "#c8f1ff", "#ffffff"],
  sunset: ["#ffd25e", "#ff8a3d", "#ff4f7a", "#b44cff", "#5a3cff", "#ff8a3d", "#ffd25e"],
  snow: ["#ffffff", "#d3ecff", "#ffffff", "#a9d4ff", "#ffffff"]
};
const SPIN: Partial<Record<FrameId, number>> = { aurora: 5000, rainbow: 4200, fire: 3200, galaxy: 9000, gold: 7000, ice: 12000, hearts: 16000, sakura: 18000, diamond: 10000, sunset: 8000, snow: 20000, bubbles: 24000 };
const STAR = "M12 0 C12.8 7.2 16.8 11.2 24 12 C16.8 12.8 12.8 16.8 12 24 C11.2 16.8 7.2 12.8 0 12 C7.2 11.2 11.2 7.2 12 0Z";
const PETAL = "M12 1 C18 6 18 15 12 23 C6 15 6 6 12 1Z";
const BOLT = "M14 0 L3 14 H10.5 L8 24 L21 9 H13.5 Z";
const THIN_STAR = "M12 0 L13.8 10.2 L24 12 L13.8 13.8 L12 24 L10.2 13.8 L0 12 L10.2 10.2Z";
const GEM = "M6 2 H18 L23 9 L12 23 L1 9 Z";
const HEART = "M12 21 C4 14.5 2 10.5 2 7.5 A4.5 4.5 0 0 1 12 6 A4.5 4.5 0 0 1 22 7.5 C22 10.5 20 14.5 12 21Z";

/** Ring thickness for an avatar of this size. */
export const frameRing = (size: number) => Math.max(3, Math.round(size * 0.1));
/** Diameter of the picture itself inside a framed avatar whose whole layout box is `size` (the ring stays inside the box). */
export const frameInner = (size: number, frame: string | null | undefined) => (isFrameId(frame) ? size - frameRing(size) * 2 : size);

/** Static ring art: pure SVG, no animation. Everything is drawn inside a `size` x `size` box. */
function buildArt(id: FrameId, size: number, gid: string) {
  const ring = frameRing(size);
  const D = size;
  const c = D / 2;
  const r = c - ring / 2;
  const grad = GRADS[id];
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
      case "bubbles":
        return (
          <Svg width={D} height={D}>
            <Circle cx={c} cy={c} r={r} stroke="#8fe3ff" strokeOpacity={0.22} strokeWidth={ring * 1.5} fill="none" />
            <Circle cx={c} cy={c} r={r} stroke="#d9f6ff" strokeOpacity={0.55} strokeWidth={ring * 0.55} fill="none" />
            <Circle cx={c} cy={c} r={r + ring * 0.3} stroke="#ffffff" strokeOpacity={0.7} strokeWidth={1} fill="none" />
          </Svg>
        );
      case "matrix":
        return (
          <Svg width={D} height={D}>
            <Circle cx={c} cy={c} r={r} stroke="#00ff6a" strokeOpacity={0.2} strokeWidth={ring * 1.8} fill="none" />
            <Circle cx={c} cy={c} r={r} stroke="#0b3d1f" strokeWidth={ring} fill="none" />
            <Circle cx={c} cy={c} r={r} stroke="#27ff7b" strokeWidth={ring * 0.8} strokeDasharray={`${ring * 0.5} ${ring * 0.7} ${ring * 1.4} ${ring * 0.7}`} fill="none" />
            <Circle cx={c} cy={c} r={r} stroke="#d6ffe5" strokeWidth={ring * 0.18} strokeOpacity={0.8} fill="none" />
          </Svg>
        );
      case "glitch":
        return (
          <Svg width={D} height={D}>
            <Circle cx={c - ring * 0.3} cy={c} r={r} stroke="#00f0ff" strokeOpacity={0.85} strokeWidth={ring * 0.75} fill="none" strokeDasharray={`${circ * 0.34} ${circ * 0.04} ${circ * 0.5} ${circ * 0.04}`} />
            <Circle cx={c + ring * 0.3} cy={c} r={r} stroke="#ff2bd6" strokeOpacity={0.85} strokeWidth={ring * 0.75} fill="none" strokeDasharray={`${circ * 0.5} ${circ * 0.06} ${circ * 0.3} ${circ * 0.06}`} />
            <Circle cx={c} cy={c} r={r} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={ring * 0.22} fill="none" strokeDasharray={`${circ * 0.12} ${circ * 0.08}`} />
          </Svg>
        );
      case "lightning":
        return (
          <Svg width={D} height={D}>
            {gradientDefs}
            <Circle cx={c} cy={c} r={r} stroke="#4aa8ff" strokeOpacity={0.3} strokeWidth={ring * 2} fill="none" />
            <Circle cx={c} cy={c} r={r} stroke={`url(#${gid})`} strokeWidth={ring * 0.85} fill="none" />
            <Circle cx={c} cy={c} r={r} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={ring * 0.2} fill="none" />
          </Svg>
        );
      default:
        return (
          <Svg width={D} height={D}>
            {gradientDefs}
            <Circle cx={c} cy={c} r={r} stroke={`url(#${gid})`} strokeWidth={ring} fill="none" />
            {id === "gold" || id === "ice" || id === "diamond" || id === "snow" || id === "sakura" ? <Circle cx={c} cy={c} r={r + ring * 0.42} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1} fill="none" /> : null}
            {id === "sunset" ? <Circle cx={c} cy={c} r={r} stroke="#ff4f7a" strokeOpacity={0.25} strokeWidth={ring * 1.9} fill="none" /> : null}
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
      case "sakura": return around(8, (x, y, i) => glyph(PETAL, x, y, ring * 1.9, i % 2 ? "#ff8fb8" : "#ffc2d9", i, (i / 8) * 360 + 20));
      case "lightning": return around(4, (x, y, i) => glyph(BOLT, x, y, ring * 2.3, "#fff36b", i, i * 12 - 10));
      case "diamond": return around(6, (x, y, i) => glyph(i % 2 ? THIN_STAR : GEM, x, y, ring * (i % 2 ? 1.5 : 1.3), i % 2 ? "#ffffff" : "#bdf1ff", i));
      case "snow": return around(8, (x, y, i) => glyph(THIN_STAR, x, y, ring * (i % 2 ? 1.1 : 1.7), "#ffffff", i, i % 2 ? 45 : 0));
      case "bubbles": return around(7, (x, y, i) => {
        const br = ring * (0.55 + (i % 3) * 0.3);
        return (
          <G key={i}>
            <Circle cx={x} cy={y} r={br} fill="#aeeaff" fillOpacity={0.35} stroke="#ffffff" strokeOpacity={0.85} strokeWidth={0.8} />
            <Circle cx={x - br * 0.35} cy={y - br * 0.35} r={br * 0.25} fill="#ffffff" fillOpacity={0.95} />
          </G>
        );
      });
      case "matrix": return around(10, (x, y, i) => glyph("M9 2 H15 V8 H9Z M9 10 H15 V16 H9Z M9 18 H15 V22 H9Z", x, y, ring * (i % 2 ? 1.0 : 1.5), i % 3 ? "#27ff7b" : "#d6ffe5", i));
      default: return null;
    }
  })();

  const crownArt = id === "crown" ? (
    <Svg width={D * 0.5} height={D * 0.375} viewBox="0 0 48 36" style={{ position: "absolute", top: -D * 0.02 }}>
      <Defs>
        <LinearGradient id={`${gid}c`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#fff3b0" /><Stop offset="0.6" stopColor="#ffc928" /><Stop offset="1" stopColor="#c98a00" /></LinearGradient>
      </Defs>
      <Path d="M4 30 L2 8 L14 18 L24 4 L34 18 L46 8 L44 30 Z" fill={`url(#${gid}c)`} stroke="#8a5a00" strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M4 30 H44 V34 H4 Z" fill="#c98a00" />
      <Circle cx={24} cy={4} r={2.6} fill="#ff4fa3" /><Circle cx={2} cy={8} r={2.2} fill="#4ad0ff" /><Circle cx={46} cy={8} r={2.2} fill="#4ad0ff" />
      <Circle cx={24} cy={24} r={2.4} fill="#ff4fa3" />
    </Svg>
  ) : null;
  return { D, ringArt, deco, crownArt };
}

const hidden = { accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" } as const;

/** Cheap, non-animated frame for lists, headers of other users, etc. `size` is the whole layout box; the picture (`children`) must be `frameInner(size, frame)` wide. */
function StaticFrame({ id, size, children }: { id: FrameId; size: number; children: ReactNode }) {
  const gid = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const { D, ringArt, deco, crownArt } = buildArt(id, size, gid);
  return (
    <View style={{ width: D, height: D, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", width: D, height: D }} {...hidden}>{ringArt}</View>
      {deco ? <View style={{ position: "absolute", width: D, height: D }} {...hidden}><Svg width={D} height={D}>{deco}</Svg></View> : null}
      {children}
      {crownArt ? <View {...hidden} style={{ position: "absolute", top: 0, alignItems: "center", width: D }}>{crownArt}</View> : null}
    </View>
  );
}

function AnimatedFrame({ id, size, children }: { id: FrameId; size: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  const gid = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    const ms = SPIN[id];
    if (ms) spin.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })), -1);
  }, [reduce, id, spin, pulse]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: 0.55 + pulse.value * 0.45 }));
  const jitter = useSharedValue(0);
  useEffect(() => {
    if (reduce || id !== "glitch") return;
    jitter.value = withRepeat(withSequence(withTiming(0, { duration: 900 }), withTiming(2.5, { duration: 50 }), withTiming(-2, { duration: 50 }), withTiming(0, { duration: 50 }), withTiming(-3, { duration: 1300 }), withTiming(3, { duration: 40 }), withTiming(0, { duration: 40 })), -1);
  }, [reduce, id, jitter]);
  const jitterStyle = useAnimatedStyle(() => ({ transform: [{ translateX: jitter.value }] }));
  const twinkle = useAnimatedStyle(() => ({ opacity: 0.6 + pulse.value * 0.4 }));
  const { D, ringArt, deco, crownArt } = buildArt(id, size, gid);
  const rotates = !!SPIN[id] && !reduce;
  return (
    <View style={{ width: D, height: D, alignItems: "center", justifyContent: "center" }}>
      <Animated.View {...hidden} style={[{ position: "absolute", width: D, height: D }, rotates ? spinStyle : null, id === "neon" || id === "lightning" || id === "matrix" ? pulseStyle : null, id === "glitch" && !reduce ? jitterStyle : null]}>{ringArt}</Animated.View>
      {deco ? (
        <Animated.View {...hidden} style={[{ position: "absolute", width: D, height: D }, rotates && id !== "galaxy" && id !== "gold" ? spinStyle : null, id === "galaxy" || id === "gold" || id === "lightning" || id === "diamond" || id === "matrix" ? twinkle : null]}>
          <Svg width={D} height={D}>{deco}</Svg>
        </Animated.View>
      ) : null}
      {children}
      {crownArt ? <View {...hidden} style={{ position: "absolute", top: 0, alignItems: "center", width: D }}>{crownArt}</View> : null}
    </View>
  );
}

/** Ring AROUND the picture, drawn inside the `size` box (no overflow). Animate only in the editor and on your own header. */
export function AvatarFrame({ frame, size, animated = false, children }: { frame: string | null | undefined; size: number; animated?: boolean; children: ReactNode }) {
  if (!isFrameId(frame)) return <>{children}</>;
  return animated ? <AnimatedFrame id={frame} size={size}>{children}</AnimatedFrame> : <StaticFrame id={frame} size={size}>{children}</StaticFrame>;
}
