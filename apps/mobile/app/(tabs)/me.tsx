import { useState } from "react";
import { Alert, Share, View } from "react-native";
import { WEB_URL } from "@/lib/env";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LIMITS } from "@unsaid/shared";
import { ApiError } from "@unsaid/api-client";
import { uploadAvatar } from "@/lib/uploadAvatar";
import { Avatar } from "@/components/Avatar";
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
  const { me, patchMe, logout } = useAuth();
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

  const openEdit = () => { setDisplayName(p.displayName ?? ""); setBio(p.bio ?? ""); setPrompt(p.prompt ?? ""); setEditing(true); };
  const saveProfile = () => guard(async () => {
    const next = await api.profile.update({ displayName: displayName.trim(), bio: bio.trim(), prompt: prompt.trim() });
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

  const pickAvatar = async (crop: boolean) => {
    // The system photo picker needs NO storage permission (and asking for READ_MEDIA_IMAGES, which we don't declare, always fails on Android 13+).
    let res: ImagePicker.ImagePickerResult;
    try {
      res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: crop, quality: 0.9 });
    } catch (e) {
      toast.show(t("me.photoPickFailed", { reason: String((e as Error)?.message ?? e).slice(0, 120) }), "error");
      return;
    }
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if (a.fileSize && a.fileSize > LIMITS.avatarMaxBytes) { toast.show(t("me.photoTooBig"), "error"); return; }
    const type = a.mimeType === "image/png" || a.mimeType === "image/webp" || a.mimeType === "image/gif" ? a.mimeType : "image/jpeg";
    const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : type === "image/gif" ? "gif" : "jpg";
    setBusy(true);
    try {
      const next = await uploadAvatar(a.uri, `avatar.${ext}`, type);
      patchMe((m) => ({ ...m, profile: next })); toast.show(t("me.photoUpdated"), "success");
    } catch (e) {
      toast.show(t("me.photoUploadFailed", { reason: errorMessage(e) }), "error"); report(e);
    }
    setBusy(false);
  };
  const removeAvatar = () => guard(async () => { const next = await api.profile.removeAvatar(); patchMe((m) => ({ ...m, profile: next })); toast.show(t("me.photoRemoved"), "success"); });

  return (
    <Screen tabs>
      <Text variant="title">{t("me.title")}</Text>
      <UpdateCard />
      <Card style={{ alignItems: "center", gap: 10 }}>
        <Avatar name={p.displayName || p.username} uri={p.avatarUrl} size={88} />
        <Text variant="heading">{p.displayName || p.username}</Text>
        <Text tone="muted" style={{ textAlign: "center" }}>{isolate(`@${p.username}`)}</Text>
        {p.bio ? <Text style={{ textAlign: "center" }}>{p.bio}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <Button title={t("me.editProfile")} small variant="secondary" onPress={openEdit} />
          <Button title={p.avatarUrl ? t("me.changePhoto") : t("me.addPhoto")} small variant="ghost" onPress={() => Alert.alert(t("me.changePhoto"), undefined, [{ text: t("me.photoCrop"), onPress: () => void pickAvatar(true) }, { text: t("me.photoGif"), onPress: () => void pickAvatar(false) }, { text: t("common.cancel"), style: "cancel" }])} loading={busy} />
        </View>
        {p.avatarUrl ? <Button title={t("me.removePhoto")} small variant="ghost" onPress={removeAvatar} /> : null}
      </Card>

      {!me.user.emailVerified ? (
        <Card style={{ gap: 8 }}>
          <Badge label={t("me.emailNotVerified")} tone="warning" />
          <Text tone="muted">{t("me.verifyBody", { email: me.user.email })}</Text>
          <Button title={t("me.resend")} small variant="secondary" onPress={() => guard(async () => { await api.auth.resendVerification(); toast.show(t("me.verificationSent"), "success"); })} />
        </Card>
      ) : null}

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
      <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>{t("me.signedInAs", { email: me.user.email })}</Text>
      <Button title={t("me.logOut")} variant="danger" onPress={() => setConfirmLogout(true)} />
      <Button title={t("me.deleteAccount")} variant="ghost" onPress={() => { setDeletePassword(""); setDeleting(true); }} />

      <BottomSheet visible={editing} onClose={() => setEditing(false)} title={t("me.editTitle")}>
        <Input label={t("me.displayName")} value={displayName} onChangeText={setDisplayName} maxLength={LIMITS.displayNameMax} />
        <Textarea label={t("me.bio")} value={bio} onChangeText={setBio} max={LIMITS.bioMax} />
        <Input label={t("me.prompt")} value={prompt} onChangeText={setPrompt} maxLength={LIMITS.promptMax} placeholder={t("me.promptPlaceholder")} />
        <Button title={t("common.save")} onPress={saveProfile} loading={busy} disabled={displayName.trim().length === 0 || bio.length > LIMITS.bioMax} />
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
