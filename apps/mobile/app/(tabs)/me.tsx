import { useState } from "react";
import { Share, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { WEB_URL } from "@/lib/env";
import { useRouter } from "expo-router";
import { LIMITS } from "@unsaid/shared";
import { ApiError } from "@unsaid/api-client";
import { Avatar } from "@/components/Avatar";
import { AvatarEditor } from "@/components/AvatarEditor";
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
  const [avatarEditor, setAvatarEditor] = useState(false);
  const [emailSheet, setEmailSheet] = useState(false);
  const [newEmail, setNewEmail] = useState("");
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

  const changeEmail = () => guard(async () => {
    const email = newEmail.trim().toLowerCase();
    if (email === me.user.email.toLowerCase()) { toast.show(t("me.email.same"), "error"); return; }
    await api.auth.changeEmail({ email });
    await refreshMe();
    setEmailSheet(false);
    toast.show(t("me.email.changed", { email }), "success");
  });
  return (
    <Screen tabs>
      <Text variant="title">{t("me.title")}</Text>
      <UpdateCard />
      <Card style={{ alignItems: "center", gap: 10, overflow: "hidden", paddingTop: 22 }}>
        <LinearGradient colors={[withAlpha(brand.gradient[0], 0.22), withAlpha(brand.gradient[1], 0.12), "transparent"]} style={{ position: "absolute", top: 0, start: 0, end: 0, height: 130 }} />
        <PressableScale accessibilityRole="button" accessibilityLabel={t("me.editPhoto")} onPress={() => setAvatarEditor(true)}>
          <Avatar name={p.displayName || p.username} uri={p.avatarUrl} size={104} frame={p.avatarFrame} animated />
        </PressableScale>
        <Text variant="heading">{p.displayName || p.username}</Text>
        <Text tone="muted" style={{ textAlign: "center" }}>{isolate(`@${p.username}`)}</Text>
        {p.bio ? <Text style={{ textAlign: "center" }}>{p.bio}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <Button title={t("me.editProfile")} small variant="secondary" onPress={openEdit} />
          <Button title={t("me.editPhoto")} small variant="ghost" onPress={() => setAvatarEditor(true)} />
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
          <Button title={t("me.email.change")} small variant="secondary" onPress={() => { setNewEmail(""); setEmailSheet(true); }} />
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
      <AvatarEditor visible={avatarEditor} onClose={() => setAvatarEditor(false)} />
      <BottomSheet visible={emailSheet} onClose={() => setEmailSheet(false)} title={t("me.email.title")}>
        <Text tone="muted">{t("me.email.body")}</Text>
        <Input ltr label={t("me.email.newEmail")} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" />
        <Text variant="caption" tone="muted">{t("me.email.notice")}</Text>
        <Button title={t("me.email.submit")} onPress={changeEmail} loading={busy} disabled={!newEmail.includes("@")} />
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
