import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useTheme, type Colors } from "@/theme";
import { useT } from "@/i18n";

export type IconName =
  | "inbox" | "share" | "bell" | "user" | "reply" | "trash" | "flag" | "block" | "copy" | "plus" | "close" | "check"
  | "chevron" | "lock" | "pause" | "link" | "send" | "eye" | "shield" | "refresh" | "more" | "camera" | "wifi-off" | "minus" | "qr" | "mail" | "chat";

const paths: Record<IconName, (c: string) => React.ReactNode> = {
  inbox: (c) => <Path d="M3 13l2.5-7.5A2 2 0 017.4 4h9.2a2 2 0 011.9 1.5L21 13v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5zm0 0h5l1.5 2.5h5L16 13h5" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  share: (c) => <Path d="M12 3v12m0-12L8 7m4-4l4 4M5 12v6a2 2 0 002 2h10a2 2 0 002-2v-6" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  bell: (c) => <Path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16zm4 4a2 2 0 004 0" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  user: (c) => <><Circle cx={12} cy={8} r={4} stroke={c} strokeWidth={1.8} fill="none" /><Path d="M4 20c1-4 4.5-6 8-6s7 2 8 6" stroke={c} strokeWidth={1.8} strokeLinecap="round" fill="none" /></>,
  reply: (c) => <Path d="M10 8L4 13l6 5v-3.2c5 0 8 1.2 10 4.2-.5-5.5-3.5-9-10-9.5V8z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" fill="none" />,
  trash: (c) => <Path d="M4 7h16M10 11v6m4-6v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  flag: (c) => <Path d="M5 21V4m0 0h11l-2 4 2 4H5" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  block: (c) => <><Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={1.8} fill="none" /><Path d="M6 6l12 12" stroke={c} strokeWidth={1.8} /></>,
  copy: (c) => <><Rect x={9} y={9} width={11} height={11} rx={2.5} stroke={c} strokeWidth={1.8} fill="none" /><Path d="M5 15V6a2 2 0 012-2h9" stroke={c} strokeWidth={1.8} strokeLinecap="round" fill="none" /></>,
  plus: (c) => <Path d="M12 5v14M5 12h14" stroke={c} strokeWidth={2} strokeLinecap="round" />,
  close: (c) => <Path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth={2} strokeLinecap="round" />,
  check: (c) => <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  chevron: (c) => <Path d="M9 6l6 6-6 6" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  lock: (c) => <><Rect x={5} y={11} width={14} height={9} rx={2.5} stroke={c} strokeWidth={1.8} fill="none" /><Path d="M8 11V8a4 4 0 018 0v3" stroke={c} strokeWidth={1.8} fill="none" /></>,
  pause: (c) => <Path d="M8 5v14M16 5v14" stroke={c} strokeWidth={2.4} strokeLinecap="round" />,
  link: (c) => <Path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" stroke={c} strokeWidth={1.8} strokeLinecap="round" fill="none" />,
  send: (c) => <Path d="M4 12L20 4l-5 16-3.5-6.5L4 12z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" fill="none" />,
  eye: (c) => <><Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke={c} strokeWidth={1.8} fill="none" /><Circle cx={12} cy={12} r={3} stroke={c} strokeWidth={1.8} fill="none" /></>,
  shield: (c) => <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" fill="none" />,
  refresh: (c) => <Path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  more: (c) => <><Circle cx={5} cy={12} r={1.6} fill={c} /><Circle cx={12} cy={12} r={1.6} fill={c} /><Circle cx={19} cy={12} r={1.6} fill={c} /></>,
  camera: (c) => <><Path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" fill="none" /><Circle cx={12} cy={13} r={3.5} stroke={c} strokeWidth={1.8} fill="none" /></>,
  minus: (c) => <Path d="M5 12h14" stroke={c} strokeWidth={2} strokeLinecap="round" />,
  qr: (c) => <><Rect x={4} y={4} width={6} height={6} rx={1} stroke={c} strokeWidth={1.8} fill="none" /><Rect x={14} y={4} width={6} height={6} rx={1} stroke={c} strokeWidth={1.8} fill="none" /><Rect x={4} y={14} width={6} height={6} rx={1} stroke={c} strokeWidth={1.8} fill="none" /><Path d="M14 14h3v3m3 0v3h-3m-3 0v-3" stroke={c} strokeWidth={1.8} strokeLinecap="round" fill="none" /></>,
  mail: (c) => <><Rect x={3} y={5} width={18} height={14} rx={3} stroke={c} strokeWidth={1.8} fill="none" /><Path d="M4 7l8 6 8-6" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,
  chat: (c) => <Path d="M4 5h16v11H9l-5 4V5z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" fill="none" />,
  "wifi-off": (c) => <Path d="M3 3l18 18M5 10a10 10 0 015-2.5M19 10a10 10 0 00-4-2.2M8.5 13.5a6 6 0 013-1.4m4 .6a6 6 0 011 .8M12 18h.01" stroke={c} strokeWidth={1.8} strokeLinecap="round" fill="none" />
};

/**
 * `dir` is for the chevron: "forward" points toward the reading direction's end (list rows), "back" toward its start (back buttons).
 * Arrow-like glyphs (chevron, send, reply) mirror automatically under an RTL layout; everything else is symmetric.
 */
export function Icon({ name, size = 22, tone = "text", color, dir = "forward" }: { name: IconName; size?: number; tone?: keyof Colors; color?: string; dir?: "forward" | "back" }) {
  const { colors } = useTheme();
  const { isRTL } = useT();
  const flip = name === "chevron" ? (dir === "back" ? !isRTL : isRTL) : name === "send" || name === "reply" ? isRTL : false;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
      {paths[name](color ?? colors[tone])}
    </Svg>
  );
}
