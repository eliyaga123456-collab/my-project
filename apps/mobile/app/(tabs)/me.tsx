import { useState } from "react";
import { Share, View } from "react-native";
import { WEB_URL } from "@/lib/env";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LIMITS } from "@unsaid/shared";
import { ApiError } from "@unsaid/api-client";
import { Avatar } from "@/components/Avatar";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ConfirmSheet } from "@/components/ConfirmSheet";
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

export default function Me() {
  const router = useRouter();
  const toast = useToast();
  const { report } = useNetwork();
  const { me, patchMe, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState(me?.profile.displayName ?? "");
  const [bio, setBio] = useState(me?.profile.bio ?? "");
  const [prompt, setPrompt] = useState(me?.profile.prompt ?? "");
  const [username, setUsername] = useState(me?.profile.username ?? "");
  const [usernameError, setUsernameError] = useState<string | null>(null);

  if (!me) return null;
  const p = me.profile;
  const guard = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { toast.show(errorMessage(e), "error"); report(e); } setBusy(false); };

  const openEdit = () => { setDisplayName(p.displayName); setBio(p.bio); setPrompt(p.prompt); setEditing(true); };
  const saveProfile = () => guard(async () => {
    const next = await api.profile.update({ displayName: displayName.trim(), bio: bio.trim(), prompt: prompt.trim() });
    patchMe((m) => ({ ...m, profile: next })); setEditing(false); toast.show("Profile saved", "success");
  });

  const saveUsername = async () => {
    const v = validateUsername(username);
    if (!v.ok) { setUsernameError(v.error); return; }
    setUsernameError(null); setBusy(true);
    try {
      const next = await api.profile.changeUsername(v.value);
      patchMe((m) => ({ ...m, profile: next, user: { ...m.user, username: next.username } })); setRenaming(false); toast.show("Username changed. Your old link no longer works.", "success");
    } catch (e) {
      if (e instanceof ApiError && (e.code === "conflict" || e.code === "validation_error" || e.code === "rate_limited")) setUsernameError(e.friendly); else { toast.show(errorMessage(e), "error"); report(e); }
    }
    setBusy(false);
  };

  const pickAvatar = () => guard(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast.show("Allow photo access in Settings to choose a picture.", "info"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if (a.fileSize && a.fileSize > LIMITS.avatarMaxBytes) { toast.show("That image is over 2 MB. Pick a smaller one.", "error"); return; }
    const type = a.mimeType === "image/png" || a.mimeType === "image/webp" ? a.mimeType : "image/jpeg";
    const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
    const form = new FormData();
    form.append("file", { uri: a.uri, name: `avatar.${ext}`, type } as unknown as Blob);
    const next = await api.profile.uploadAvatar(form);
    patchMe((m) => ({ ...m, profile: next })); toast.show("Photo updated", "success");
  });
  const removeAvatar = () => guard(async () => { const next = await api.profile.removeAvatar(); patchMe((m) => ({ ...m, profile: next })); toast.show("Photo removed", "success"); });

  return (
    <Screen tabs>
      <Text variant="title">Me</Text>
      <Card style={{ alignItems: "center", gap: 10 }}>
        <Avatar name={p.displayName || p.username} uri={p.avatarUrl} size={88} />
        <Text variant="heading">{p.displayName || p.username}</Text>
        <Text tone="muted">@{p.username}</Text>
        {p.bio ? <Text style={{ textAlign: "center" }}>{p.bio}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <Button title="Edit profile" small variant="secondary" onPress={openEdit} />
          <Button title={p.avatarUrl ? "Change photo" : "Add photo"} small variant="ghost" onPress={pickAvatar} loading={busy} />
        </View>
        {p.avatarUrl ? <Button title="Remove photo" small variant="ghost" onPress={removeAvatar} /> : null}
      </Card>

      {!me.user.emailVerified ? (
        <Card style={{ gap: 8 }}>
          <Badge label="Email not verified" tone="warning" />
          <Text tone="muted">Verify {me.user.email} to publish public answers.</Text>
          <Button title="Resend verification email" small variant="secondary" onPress={() => guard(async () => { await api.auth.resendVerification(); toast.show("Verification email sent", "success"); })} />
        </Card>
      ) : null}

      <Card style={{ paddingVertical: 4 }}>
        <NavRow icon="user" label="Username" detail={`@${p.username}`} onPress={() => { setUsername(p.username); setUsernameError(null); setRenaming(true); }} />
        <NavRow icon="shield" label="Safety & privacy" onPress={() => router.push("/settings/safety")} />
        <NavRow icon="bell" label="Notifications" onPress={() => router.push("/settings/notifications")} />
        <NavRow icon="lock" label="Sessions" onPress={() => router.push("/settings/sessions")} />
        <NavRow icon="lock" label="Change password" onPress={() => router.push("/settings/password")} />
        <NavRow icon="send" label="Download the app — invite friends" onPress={() => { void Share.share({ message: `Get EAR — anonymous questions & replies: ${WEB_URL}/install`, url: `${WEB_URL}/install` }).catch(() => undefined); }} />
      </Card>
      <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>Signed in as {me.user.email}</Text>
      <Button title="Log out" variant="danger" onPress={() => setConfirmLogout(true)} />

      <BottomSheet visible={editing} onClose={() => setEditing(false)} title="Edit profile">
        <Input label="Display name" value={displayName} onChangeText={setDisplayName} maxLength={LIMITS.displayNameMax} />
        <Textarea label="Bio" value={bio} onChangeText={setBio} max={LIMITS.bioMax} />
        <Input label="Prompt shown above the message box" value={prompt} onChangeText={setPrompt} maxLength={LIMITS.promptMax} placeholder="Ask me anything…" />
        <Button title="Save" onPress={saveProfile} loading={busy} disabled={displayName.trim().length === 0 || bio.length > LIMITS.bioMax} />
      </BottomSheet>
      <BottomSheet visible={renaming} onClose={() => setRenaming(false)} title="Change username">
        <Text tone="muted">Your old link stops working and you can change this once every 7 days.</Text>
        <Input label="Username" value={username} onChangeText={(t) => setUsername(t.toLowerCase())} error={usernameError} autoCapitalize="none" autoCorrect={false} maxLength={LIMITS.usernameMax} />
        <Button title="Change username" onPress={saveUsername} loading={busy} disabled={username === p.username} />
      </BottomSheet>
      <ConfirmSheet visible={confirmLogout} title="Log out?" message="You'll stop getting push notifications on this device until you sign in again." confirmLabel="Log out" destructive onConfirm={() => { setConfirmLogout(false); void logout(); }} onCancel={() => setConfirmLogout(false)} />
    </Screen>
  );
}
