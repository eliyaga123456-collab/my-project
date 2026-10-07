import { useEffect, useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AVATAR_FRAMES, LIMITS } from "@unsaid/shared";
import { useT } from "@/i18n";
import { useTheme, withAlpha } from "@/theme";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { uploadAvatar } from "@/lib/uploadAvatar";
import { uploadAvatarVideo } from "@/lib/uploadAvatarVideo";
import { useAuth } from "@/providers/AuthProvider";
import { useNetwork } from "@/providers/NetworkProvider";
import { Avatar } from "./Avatar";
import { AvatarCropModal } from "./AvatarCropModal";
import { VideoAvatarSheet } from "./VideoAvatarSheet";
import { isFrameId, type FrameId } from "./AvatarFrame";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { PressableScale } from "./Pressable";
import { Text } from "./Text";
import { useToast } from "./Toast";

type Pending = { uri: string; name: string; type: string };

/** One place to edit the profile picture: live preview with the chosen frame, photo/GIF/video pickers, a frame strip and a single Save. */
export function AvatarEditor({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const { colors, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { report } = useNetwork();
  const { me, patchMe } = useAuth();
  const p = me?.profile;
  const [frame, setFrame] = useState<FrameId | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [cropSrc, setCropSrc] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [video, setVideo] = useState<{ uri: string; mime: string; durationMs: number | null } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) { setFrame(isFrameId(p?.avatarFrame) ? p.avatarFrame : null); setPending(null); setCropSrc(null); setVideo(null); }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!me || !p) return null;

  const name = p.displayName || p.username;
  const savedFrame = isFrameId(p.avatarFrame) ? p.avatarFrame : null;
  const dirty = !!pending || frame !== savedFrame;

  const pickPhoto = async () => {
    let res: ImagePicker.ImagePickerResult;
    try { res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 1 }); }
    catch (e) { toast.show(t("me.photoPickFailed", { reason: String((e as Error)?.message ?? e).slice(0, 120) }), "error"); return; }
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const isGif = a.mimeType === "image/gif";
    if (!isGif) { setCropSrc({ uri: a.uri, width: a.width, height: a.height }); return; }
    if (a.fileSize && a.fileSize > LIMITS.avatarMaxBytes) { toast.show(t("me.photoTooBig"), "error"); return; }
    setPending({ uri: a.uri, name: "avatar.gif", type: "image/gif" });
  };
  const pickVideo = async () => {
    let res: ImagePicker.ImagePickerResult;
    try { res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], allowsEditing: false }); }
    catch (e) { toast.show(t("me.video.pickFailed", { reason: String((e as Error)?.message ?? e).slice(0, 120) }), "error"); return; }
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setVideo({ uri: a.uri, mime: a.mimeType ?? "video/mp4", durationMs: a.duration ?? null });
  };
  const sendVideo = async (start: number, duration: number) => {
    if (!video) return;
    setBusy(true);
    try {
      const next = await uploadAvatarVideo(video.uri, video.mime, start, duration);
      patchMe((m) => ({ ...m, profile: next })); setVideo(null); setPending(null); toast.show(t("me.video.updated"), "success");
    } catch (e) { toast.show(t("me.video.uploadFailed", { reason: errorMessage(e) }), "error"); report(e); }
    setBusy(false);
  };
  const save = async () => {
    setBusy(true);
    try {
      let next = p;
      if (pending) next = await uploadAvatar(pending.uri, pending.name, pending.type);
      if (frame !== savedFrame) next = await api.profile.update({ avatarFrame: frame });
      patchMe((m) => ({ ...m, profile: next }));
      toast.show(t("me.editor.saved"), "success");
      onClose();
    } catch (e) { toast.show(t("me.photoUploadFailed", { reason: errorMessage(e) }), "error"); report(e); }
    setBusy(false);
  };
  const removePhoto = async () => {
    setBusy(true);
    try { const next = await api.profile.removeAvatar(); patchMe((m) => ({ ...m, profile: next })); setPending(null); toast.show(t("me.photoRemoved"), "success"); }
    catch (e) { toast.show(errorMessage(e), "error"); report(e); }
    setBusy(false);
  };

  const shownUri = pending ? pending.uri : p.avatarUrl;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
          <Text variant="title">{t("me.editor.title")}</Text>
          <IconButton icon="close" label={t("common.cancel")} filled onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }}>
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <Avatar name={name} uri={shownUri} size={220} frame={frame} animated />
          </View>
          <View style={{ gap: 8 }}>
            <Text variant="bodyStrong">{t("me.frames.title")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
              {[null, ...AVATAR_FRAMES].map((f) => {
                const on = frame === f;
                const label = f ? t(`me.frames.names.${f}`) : t("me.frames.none");
                return (
                  <PressableScale key={f ?? "none"} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={() => setFrame(f)}
                    style={{ width: 78, alignItems: "center", gap: 4, paddingVertical: 8, borderRadius: radii.md, borderWidth: on ? 2 : 1, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? withAlpha(colors.primary, 0.1) : colors.surfaceRaised }}>
                    <Avatar name={name} uri={shownUri} size={56} frame={f} />
                    <Text variant="caption" tone={on ? "primary" : "muted"} numberOfLines={1}>{label}</Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </View>
          <View style={{ gap: 10 }}>
            <Button title={t("me.editor.choosePhoto")} variant="secondary" onPress={() => void pickPhoto()} disabled={busy} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Button title={t("me.editor.gif")} variant="secondary" onPress={() => void pickPhoto()} disabled={busy} /></View>
              <View style={{ flex: 1 }}><Button title={t("me.editor.video")} variant="secondary" onPress={() => void pickVideo()} disabled={busy} /></View>
            </View>
            {p.avatarUrl && !pending ? <Button title={t("me.removePhoto")} variant="ghost" small onPress={() => void removePhoto()} disabled={busy} /> : null}
          </View>
        </ScrollView>
        <View style={{ paddingHorizontal: 16 }}>
          <Button title={t("common.save")} onPress={() => void save()} loading={busy} disabled={!dirty} />
        </View>
        <AvatarCropModal uri={cropSrc?.uri ?? null} width={cropSrc?.width ?? 0} height={cropSrc?.height ?? 0} onCancel={() => setCropSrc(null)} onDone={(png) => { setCropSrc(null); setPending({ uri: png, name: "avatar.png", type: "image/png" }); }} />
        <VideoAvatarSheet visible={!!video} uri={video?.uri ?? null} durationMs={video?.durationMs ?? null} busy={busy} onClose={() => setVideo(null)} onUpload={(st, d) => void sendVideo(st, d)} />
      </View>
    </Modal>
  );
}
