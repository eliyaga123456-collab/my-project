import { useEffect, useState } from "react";
import { View } from "react-native";
import { useT } from "@/i18n";
import { useTheme, withAlpha } from "@/theme";
import { AVATAR_VIDEO_MAX_SECONDS, clampTrim } from "@/lib/videoTrim";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Text } from "./Text";

const STEP = 0.5;
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: number; onMinus: () => void; onPlus: () => void }) {
  const { colors, radii } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: withAlpha(colors.secondary, 0.08), borderRadius: radii.lg, padding: 10, paddingStart: 16 }}>
      <Text variant="bodyStrong">{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconButton icon="minus" label={`${label} -`} filled onPress={onMinus} />
        <Text variant="heading" style={{ minWidth: 64, textAlign: "center", writingDirection: "ltr" }}>{`${value.toFixed(1)}s`}</Text>
        <IconButton icon="plus" label={`${label} +`} filled onPress={onPlus} />
      </View>
    </View>
  );
}

/** Choose where the animated avatar starts in the video and how long it runs (max 5 s). The server does the actual trimming. */
export function VideoAvatarSheet({ visible, durationMs, busy, onClose, onUpload }: { visible: boolean; durationMs: number | null; busy: boolean; onClose: () => void; onUpload: (start: number, duration: number) => void }) {
  const { t } = useT();
  const total = durationMs && durationMs > 0 ? durationMs / 1000 : null;
  const [start, setStart] = useState(0);
  const [len, setLen] = useState(AVATAR_VIDEO_MAX_SECONDS);
  useEffect(() => { if (visible) { const c = clampTrim(0, AVATAR_VIDEO_MAX_SECONDS, total); setStart(c.start); setLen(c.duration); } }, [visible, total]);
  const set = (s: number, d: number) => { const c = clampTrim(s, d, total); setStart(c.start); setLen(c.duration); };
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t("me.video.title")}>
      <Text tone="muted">{t("me.video.body", { max: AVATAR_VIDEO_MAX_SECONDS })}</Text>
      {total ? <Text variant="caption" tone="muted">{t("me.video.total", { time: fmt(total) })}</Text> : null}
      <Stepper label={t("me.video.start")} value={start} onMinus={() => set(start - STEP, len)} onPlus={() => set(start + STEP, len)} />
      <Stepper label={t("me.video.length")} value={len} onMinus={() => set(start, len - STEP)} onPlus={() => set(start, len + STEP)} />
      <Text variant="bodyStrong" style={{ textAlign: "center", writingDirection: "ltr" }}>{`${fmt(start)}  →  ${fmt(start + len)}`}</Text>
      <Button title={t("me.video.upload")} onPress={() => onUpload(start, len)} loading={busy} />
    </BottomSheet>
  );
}
