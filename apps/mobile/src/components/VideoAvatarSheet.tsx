import { useEffect, useState } from "react";
import { View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useT } from "@/i18n";
import { useTheme, withAlpha } from "@/theme";
import { AVATAR_VIDEO_MAX_SECONDS, clampTrim } from "@/lib/videoTrim";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { SimpleSlider } from "./SimpleSlider";
import { Text } from "./Text";

const STEP = 0.5;
const PREVIEW = 200;
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

function Control({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const { colors, radii } = useTheme();
  const span = Math.max(0.0001, max - min);
  return (
    <View style={{ backgroundColor: withAlpha(colors.secondary, 0.08), borderRadius: radii.lg, padding: 10, paddingStart: 16, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="bodyStrong">{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <IconButton icon="minus" label={`${label} -`} filled onPress={() => onChange(value - STEP)} />
          <Text variant="heading" style={{ minWidth: 64, textAlign: "center", writingDirection: "ltr" }}>{`${value.toFixed(1)}s`}</Text>
          <IconButton icon="plus" label={`${label} +`} filled onPress={() => onChange(value + STEP)} />
        </View>
      </View>
      {max > min ? <SimpleSlider label={label} value={(value - min) / span} onChange={(f) => onChange(Math.round((min + f * span) * 10) / 10)} color={colors.primary} track={withAlpha(colors.secondary, 0.25)} /> : null}
    </View>
  );
}

/** Live looping, muted preview of exactly the chosen range inside a circle. Mounted only while the sheet is open. */
function Preview({ uri, start, len }: { uri: string; start: number; len: number }) {
  const { colors } = useTheme();
  const player = useVideoPlayer(uri, (p) => { p.muted = true; p.loop = false; p.volume = 0; });
  useEffect(() => {
    try { player.currentTime = start; player.play(); } catch { /* player released */ }
  }, [player, start, len]);
  useEffect(() => {
    const end = start + len;
    const id = setInterval(() => {
      try {
        if (player.currentTime >= end - 0.03 || player.currentTime < start - 0.3) { player.currentTime = start; }
        if (!player.playing) player.play();
      } catch { /* player released */ }
    }, 80);
    return () => clearInterval(id);
  }, [player, start, len]);
  return (
    <View style={{ alignSelf: "center", width: PREVIEW, height: PREVIEW, borderRadius: PREVIEW / 2, overflow: "hidden", backgroundColor: "#000", borderWidth: 3, borderColor: colors.primary }}>
      <VideoView player={player} nativeControls={false} contentFit="cover" surfaceType="textureView" style={{ width: PREVIEW, height: PREVIEW }} />
    </View>
  );
}

/** Choose where the animated avatar starts in the video and how long it runs (max 5 s), with a live preview. The server does the actual trimming. */
export function VideoAvatarSheet({ visible, uri, durationMs, busy, onClose, onUpload }: { visible: boolean; uri: string | null; durationMs: number | null; busy: boolean; onClose: () => void; onUpload: (start: number, duration: number) => void }) {
  const { t } = useT();
  const total = durationMs && durationMs > 0 ? durationMs / 1000 : null;
  const [start, setStart] = useState(0);
  const [len, setLen] = useState(AVATAR_VIDEO_MAX_SECONDS);
  useEffect(() => { if (visible) { const c = clampTrim(0, AVATAR_VIDEO_MAX_SECONDS, total); setStart(c.start); setLen(c.duration); } }, [visible, total]);
  const set = (s: number, d: number) => {
    // Moving the start never shortens the clip below what fits; length is capped to what is left.
    const c = clampTrim(s, d, total); setStart(c.start); setLen(c.duration);
  };
  const maxStart = total ? Math.max(0, total - 0.5) : 60;
  const maxLen = Math.min(AVATAR_VIDEO_MAX_SECONDS, total ? Math.max(0.5, total - start) : AVATAR_VIDEO_MAX_SECONDS);
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t("me.video.title")}>
      {visible && uri ? <Preview uri={uri} start={start} len={len} /> : null}
      <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>{t("me.video.previewNote")}</Text>
      <Text tone="muted">{t("me.video.body", { max: AVATAR_VIDEO_MAX_SECONDS })}</Text>
      {total ? <Text variant="caption" tone="muted">{t("me.video.total", { time: fmt(total) })}</Text> : null}
      <Control label={t("me.video.start")} value={start} min={0} max={maxStart} onChange={(v) => set(v, len)} />
      <Control label={t("me.video.length")} value={len} min={0.5} max={maxLen} onChange={(v) => set(start, v)} />
      <Text variant="bodyStrong" style={{ textAlign: "center", writingDirection: "ltr" }}>{`${fmt(start)}  →  ${fmt(start + len)}`}</Text>
      <Button title={t("me.video.upload")} onPress={() => onUpload(start, len)} loading={busy} />
    </BottomSheet>
  );
}
