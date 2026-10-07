import { useState } from "react";
import { Share, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { WEB_URL } from "@/lib/env";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { AVATAR_FRAMES, LIMITS } from "@unsaid/shared";
import { ApiError } from "@unsaid/api-client";
import { uploadAvatar } from "@/lib/uploadAvatar";
import { Avatar } from "@/components/Avatar";
import { AvatarCropModal } from "@/components/AvatarCropModal";
import { VideoAvatarSheet } from "@/components/VideoAvatarSheet";
import { uploadAvatarVideo } from "@/lib/uploadAvatarVideo";
import { PressableScale } from "@/components/Pressable";
import { Icon } from "@/components/Icon";
import { useTheme, withAlpha } from "@/theme";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { UpdateCard } from "@/components/UpdateCard";
import { Input, Textarea } from "@/components/Input";
import { NavRow } from "@/components/SettingRow";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { validateUsername } from "@/lib/validation";
import { useAuth } from "@/providers/AuthProvider";
import { useNetwork } from "@/providers/NetworkProvider";
import { Badge } from "@/components/Badge";
import { LanguagePicker } from "@/components/LanguagePicker";
import { isolate, useT } from "@/i18n";
import { installUrl, inviteMessage, safely } from "@/lib/share";

export default function Me() {
  const router = useRouter();
  const toast = useToast();
  const { t, locale } = useT();
  const { report } = useNetwork();
  const { me, patchMe, logout, refreshMe } = useAuth();
  const { colors, brand, radii } = useTheme();
  const [photoMenu, setPhotoMenu] = useState(false);
  const [cropSrc, setCropSrc] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [video, setVideo] = useState<{ uri: string; mime: string; durationMs: number | null } | null>(null);
  const [emailSheet, setEmailSheet] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState(me?.profile.whatsapp ?? "");
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState(me?.profile.displayName ?? "");
  const [bio, setBio] = useState(me?.profile.bio ?? "");
  const [prompt, setPrompt] = useState(me?.profile.prompt ?? "");
  const [username, setUsername] = useState(me?.profile.username ?? "");
  const [usernameError, setUsernameError] = useState<string | null>(null);

  if (!me) return null;
  const p = me.profile;
  const guard = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { toast.show(errorMessage(e), "error"); report(e); } setBusy(false); };

  const deleteAccount = () => guard(async () => {
    await api.auth.deleteAccount(deletePassword);
    setDeleting(false); setDeletePassword("");
    toast.show(t("me.accountDeleted"), "success");
    await logout();
  });

  const openEdit = () => { setDisplayName(p.displayName ?? ""); setBio(p.bio ?? ""); setPrompt(p.prompt ?? ""); setWhatsapp(p.whatsapp ?? ""); setWhatsappError(null); setEditing(true); };
  const saveProfile = () => guard(async () => {
    const wa = whatsapp.replace(/[\s\-()+]/g, "");
    if (wa && !/^[0-9]{7,15}$/.test(wa)) { setWhatsappError(t("me.whatsapp.invalid")); return; }
    setWhatsappError(null);
    const next = await api.profile.update({ displayName: displayName.trim(), bio: bio.trim(), prompt: prompt.trim(), whatsapp: wa });
    patchMe((m) => ({ ...m, profile: next })); setEditing(false); toast.show(t("me.profileSaved"), "success");
  });

  const saveUsername = async () => {
    const v = validateUsername(username);
    if (!v.ok) { setUsernameError(v.error); return; }
    setUsernameError(null); setBusy(true);
    try {
      const next = await api.profile.changeUsername(v.value);
      patchMe((m) => ({ ...m, profile: next, user: { ...m.user, username: next.username } })); setRenaming(false); toast.show(t("me.usernameChanged"), "success");
    } catch (e) {
      if (e instanceof ApiError && (e.code === "conflict" || e.code === "validation_error" || e.code === "rate_limited")) setUsernameError(errorMessage(e)); else { toast.show(errorMessage(e), "error"); report(e); }
    }
    setBusy(false);
  };

  const pickAvatar = async (mode: "crop" | "gif") => {
    // The system photo picker needs NO storage permission (and asking for READ_MEDIA_IMAGES, which we don't declare, always fails on Android 13+).
    let res: ImagePicker.ImagePickerResult;
    try {
      res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 1 });
    } catch (e) {
      toast.show(t("me.photoPickFailed", { reason: String((e as Error)?.message ?? e).slice(0, 120) }), "error");
      return;
    }
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if (a.fileSize && a.fileSize > LIMITS.avatarMaxBytes && mode === "gif") { toast.show(t("me.photoTooBig"), "error"); return; }
    const isGif = a.mimeType === "image/gif";
    if (mode === "crop" && !isGif) { setCropSrc({ uri: a.uri, width: a.width, height: a.height }); return; }
    const type = a.mimeType === "image/png" || a.mimeType === "image/webp" || a.mimeType === "image/gif" ? a.mimeType : "image/jpeg";
    const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : type === "image/gif" ? "gif" : "jpg";
    await sendPhoto(a.uri, `avatar.${ext}`, type);
  };
  const sendPhoto = async (uri: string, name: string, type: string) => {
    setBusy(true);
    try {
      const next = await uploadAvatar(uri, name, type);
      patchMe((m) => ({ ...m, profile: next })); toast.show(t("me.photoUpdated"), "success");
    } catch (e) {
      toast.show(t("me.photoUploadFailed", { reason: errorMessage(e) }), "error"); report(e);
    }
    setBusy(false);
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
      patchMe((m) => ({ ...m, profile: next })); setVideo(null); toast.show(t("me.video.updated"), "success");
    } catch (e) { toast.show(t("me.video.uploadFailed", { reason: errorMessage(e) }), "error"); report(e); }
    setBusy(false);
  };
  const chooseFrame = (frame: (typeof AVATAR_FRAMES)[number] | null) => guard(async () => {
    const next = await api.profile.update({ avatarFrame: frame });
    patchMe((m) => ({ ...m, profile: next })); toast.show(t("me.frames.saved"), "success");
  });
  const changeEmail = () => guard(async () => {
    const email = newEmail.trim().toLowerCase();
    if (email === me.user.email.toLowerCase()) { toast.show(t("me.email.same"), "error"); return; }
    await api.auth.changeEmail({ email, password: emailPassword });
    await refreshMe();
    setEmailSheet(false); setEmailPassword("");
    toast.show(t("me.email.changed", { email }), "success");
  });
  const removeAvatar = () => guard(async () => { const next = await api.profile.removeAvatar(); patchMe((m) => ({ ...m, profile: next })); toast.show(t("me.photoRemoved"), "success"); });

  return (
    <Screen tabs>
      <Text variant="title">{t("me.title")}</Text>
      <UpdateCard />
      <Card style={{ alignItems: "center", gap: 10, overflow: "hidden", paddingTop: 22 }}>
        <LinearGradient colors={[withAlpha(brand.gradient[0], 0.22), withAlpha(brand.gradient[1], 0.12), "transparent"]} style={{ position: "absolute", top: 0, start: 0, end: 0, height: 130 }} />
        <View style={{ paddingTop: p.avatarFrame === "crown" ? 22 : 0 }}>
          <Avatar name={p.displayName || p.username} uri={p.avatarUrl} size={88} frame={p.avatarFrame} />
        </View>
        <Text variant="heading">{p.displayName || p.username}</Text>
        <Text tone="muted" style={{ textAlign: "center" }}>{isolate(`@${p.username}`)}</Text>
        {p.bio ? <Text style={{ textAlign: "center" }}>{p.bio}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <Button title={t("me.editProfile")} small variant="secondary" onPress={openEdit} />
          <Button title={p.avatarUrl ? t("me.changePhoto") : t("me.addPhoto")} small variant="ghost" onPress={() => setPhotoMenu(true)} loading={busy} />
        </View>
        {p.avatarUrl ? <Button title={t("me.removePhoto")} small variant="ghost" onPress={removeAvatar} /> : null}
      </Card>

      <Card style={{ gap: 12 }}>
        <View>
          <Text variant="bodyStrong">{t("me.frames.title")}</Text>
          <Text variant="caption" tone="muted">{t("me.frames.body")}</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 10 }}>
          {[null, ...AVATAR_FRAMES].map((f) => {
            const on = (p.avatarFrame ?? null) === f;
            const label = f ? t(`me.frames.names.${f}`) : t("me.frames.none");
            return (
              <PressableScale key={f ?? "none"} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={() => { if (!on) void chooseFrame(f); }}
                style={{ width: 66, alignItems: "center", gap: 4, paddingVertical: 8, paddingTop: f === "crown" ? 18 : 8, borderRadius: radii.md, borderWidth: on ? 2 : 1, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? withAlpha(colors.primary, 0.1) : colors.surfaceRaised }}>
                <Avatar name={p.displayName || p.username} uri={p.avatarUrl} size={38} frame={f} />
                <Text variant="caption" tone={on ? "primary" : "muted"} numberOfLines={1}>{label}</Text>
              </PressableScale>
            );
          })}
        </View>
      </Card>

      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon name="mail" tone="secondary" />
          <View style={{ flex: 1 }}>
            <Text variant="label" tone="muted">{t("me.email.label")}</Text>
            <Text numberOfLines={1} style={{ writingDirection: "ltr", textAlign: "left" }}>{me.user.email}</Text>
          </View>
          <Badge label={me.user.emailVerified ? t("me.email.verified") : t("me.email.unverified")} tone={me.user.emailVerified ? "success" : "warning"} />
        </View>
        {!me.user.emailVerified ? <Text tone="muted">{t("me.verifyBody", { email: me.user.email })}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Button title={t("me.email.change")} small variant="secondary" onPress={() => { setNewEmail(""); setEmailPassword(""); setEmailSheet(true); }} />
          {!me.user.emailVerified ? <Button title={t("me.resend")} small variant="ghost" onPress={() => guard(async () => { await api.auth.resendVerification(); toast.show(t("me.verificationSent"), "success"); })} /> : null}
        </View>
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        <NavRow icon="user" label={t("me.username")} detail={isolate(`@${p.username}`)} onPress={() => { setUsername(p.username); setUsernameError(null); setRenaming(true); }} />
        <NavRow icon="shield" label={t("me.safety")} onPress={() => router.push("/settings/safety")} />
        <NavRow icon="bell" label={t("me.notifications")} onPress={() => router.push("/settings/notifications")} />
        <NavRow icon="lock" label={t("me.sessions")} onPress={() => router.push("/settings/sessions")} />
        <NavRow icon="lock" label={t("me.changePassword")} onPress={() => router.push("/settings/password")} />
        <NavRow icon="send" label={t("me.invite")} onPress={() => { void safely(() => Share.share({ message: inviteMessage("me.inviteMessage", installUrl(WEB_URL)) }), (e) => toast.show(errorMessage(e), "error")); }} />
      </Card>
      <Card style={{ gap: 10 }}>
        <Text variant="bodyStrong">{locale === "he" ? `${isolate("שפה")} / ${isolate("Language")}` : `${isolate("Language")} / ${isolate("שפה")}`}</Text>
        <LanguagePicker />
      </Card>
            <Button title={t("me.logOut")} variant="danger" onPress={() => setConfirmLogout(true)} />
      <Button title={t("me.deleteAccount")} variant="ghost" onPress={() => { setDeletePassword(""); setDeleting(true); }} />

      <BottomSheet visible={editing} onClose={() => setEditing(false)} title={t("me.editTitle")}>
        <Input label={t("me.displayName")} value={displayName} onChangeText={setDisplayName} maxLength={LIMITS.displayNameMax} />
        <Textarea label={t("me.bio")} value={bio} onChangeText={setBio} max={LIMITS.bioMax} />
        <Input label={t("me.prompt")} value={prompt} onChangeText={setPrompt} maxLength={LIMITS.promptMax} placeholder={t("me.promptPlaceholder")} />
        <Input ltr label={t("me.whatsapp.label")} value={whatsapp} onChangeText={(v) => { setWhatsapp(v); if (whatsappError) setWhatsappError(null); }} placeholder={t("me.whatsapp.placeholder")} keyboardType="phone-pad" error={whatsappError} maxLength={20} />
        <Text variant="caption" tone="muted">{t("me.whatsapp.note")}</Text>
        <Button title={t("common.save")} onPress={saveProfile} loading={busy} disabled={displayName.trim().length === 0 || bio.length > LIMITS.bioMax} />
      </BottomSheet>
      <BottomSheet visible={photoMenu} onClose={() => setPhotoMenu(false)} title={t("me.changePhoto")}>
        <Button title={t("me.photoCrop")} onPress={() => { setPhotoMenu(false); void pickAvatar("crop"); }} />
        <Button title={t("me.photoGif")} variant="secondary" onPress={() => { setPhotoMenu(false); void pickAvatar("gif"); }} />
        <Button title={t("me.photoVideo")} variant="secondary" onPress={() => { setPhotoMenu(false); void pickVideo(); }} />
        <Button title={t("common.cancel")} variant="ghost" onPress={() => setPhotoMenu(false)} />
      </BottomSheet>
      <AvatarCropModal uri={cropSrc?.uri ?? null} width={cropSrc?.width ?? 0} height={cropSrc?.height ?? 0} onCancel={() => setCropSrc(null)} onDone={(png) => { setCropSrc(null); void sendPhoto(png, "avatar.png", "image/png"); }} />
      <VideoAvatarSheet visible={!!video} durationMs={video?.durationMs ?? null} busy={busy} onClose={() => setVideo(null)} onUpload={(st, d) => void sendVideo(st, d)} />
      <BottomSheet visible={emailSheet} onClose={() => setEmailSheet(false)} title={t("me.email.title")}>
        <Text tone="muted">{t("me.email.body")}</Text>
        <Input ltr label={t("me.email.newEmail")} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" />
        <Input ltr label={t("me.email.password")} value={emailPassword} onChangeText={setEmailPassword} secureTextEntry textContentType="password" autoComplete="current-password" />
        <Button title={t("me.email.submit")} onPress={changeEmail} loading={busy} disabled={!newEmail.includes("@") || !emailPassword} />
      </BottomSheet>
      <BottomSheet visible={renaming} onClose={() => setRenaming(false)} title={t("me.renameTitle")}>
        <Text tone="muted">{t("me.renameBody")}</Text>
        <Input ltr label={t("me.username")} value={username} onChangeText={(t) => setUsername(t.toLowerCase())} error={usernameError} autoCapitalize="none" autoCorrect={false} maxLength={LIMITS.usernameMax} />
        <Button title={t("me.renameSubmit")} onPress={saveUsername} loading={busy} disabled={username === p.username} />
      </BottomSheet>
      <BottomSheet visible={deleting} onClose={() => setDeleting(false)} title={t("me.deleteTitle")}>
        <Text tone="muted">{t("me.deleteBody")}</Text>
        <Input ltr label={t("me.deletePassword")} value={deletePassword} onChangeText={setDeletePassword} secureTextEntry textContentType="password" autoComplete="current-password" />
        <Button title={t("me.deleteConfirm")} variant="danger" onPress={deleteAccount} loading={busy} disabled={!deletePassword} />
        <Button title={t("common.cancel")} variant="ghost" onPress={() => setDeleting(false)} />
      </BottomSheet>
      <ConfirmSheet visible={confirmLogout} title={t("me.logoutTitle")} message={t("me.logoutBody")} confirmLabel={t("me.logOut")} destructive onConfirm={() => { setConfirmLogout(false); void logout(); }} onCancel={() => setConfirmLogout(false)} />
    </Screen>
  );
}
