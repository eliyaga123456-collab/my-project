import { useState } from "react";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { SubHeader } from "@/components/SubHeader";
import { Text } from "@/components/Text";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { passwordRules, validatePassword } from "@/lib/validation";
import { useNetwork } from "@/providers/NetworkProvider";
import { Icon } from "@/components/Icon";
import { View } from "react-native";

export default function ChangePassword() {
  const router = useRouter();
  const toast = useToast();
  const { report } = useNetwork();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const v = validatePassword(next);
    if (!v.ok) { setError(v.error); return; }
    if (current.length === 0) { setError("Enter your current password"); return; }
    setBusy(true); setError(null);
    try {
      await api.auth.changePassword({ currentPassword: current, newPassword: v.value });
      toast.show("Password changed. Other devices were signed out.", "success");
      router.back();
    } catch (e) { setError(errorMessage(e)); report(e); setBusy(false); }
  };

  return (
    <Screen>
      <SubHeader title="Change password" />
      <Input label="Current password" value={current} onChangeText={setCurrent} secureTextEntry textContentType="password" autoComplete="current-password" />
      <Input label="New password" value={next} onChangeText={setNext} secureTextEntry textContentType="newPassword" autoComplete="new-password" error={error} />
      <View style={{ gap: 4 }}>
        {passwordRules(next).map((r) => (
          <View key={r.id} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Icon name={r.met ? "check" : "close"} size={14} tone={r.met ? "success" : "muted"} />
            <Text variant="caption" tone={r.met ? "success" : "muted"}>{r.label}</Text>
          </View>
        ))}
      </View>
      <Button title="Update password" onPress={submit} loading={busy} />
    </Screen>
  );
}
