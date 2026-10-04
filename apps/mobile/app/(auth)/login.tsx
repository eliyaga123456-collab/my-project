import { useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorState";
import { IconButton } from "@/components/IconButton";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useT } from "@/i18n";
import { useAuth } from "@/providers/AuthProvider";
import { useNetwork } from "@/providers/NetworkProvider";
import { errorMessage } from "@/lib/errors";
import { validateEmail } from "@/lib/validation";

export default function Login() {
  const router = useRouter();
  const { t } = useT();
  const { login } = useAuth();
  const { report } = useNetwork();
  const pw = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e = validateEmail(email);
    setEmailError(e.ok ? null : e.error);
    if (!e.ok || password.length === 0) { if (e.ok) setError(t("auth.login.enterPassword")); return; }
    setBusy(true); setError(null);
    try { await login({ email: e.value, password }); } catch (err) { setError(errorMessage(err)); report(err); setBusy(false); }
  };

  return (
    <Screen>
      <IconButton icon="chevron" dir="back" label={t("common.back")} onPress={() => router.back()} style={{ marginStart: -8 }} />
      <Text variant="title">{t("auth.login.title")}</Text>
      <Text tone="muted">{t("auth.login.subtitle")}</Text>
      {error ? <ErrorBanner message={error} /> : null}
      <Input ltr label={t("auth.email")} value={email} onChangeText={setEmail} error={emailError} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" returnKeyType="next" onSubmitEditing={() => pw.current?.focus()} />
      <Input ltr ref={pw} label={t("auth.password")} value={password} onChangeText={setPassword} secureTextEntry textContentType="password" autoComplete="current-password" returnKeyType="go" onSubmitEditing={submit} />
      <Button title={t("auth.login.submit")} onPress={submit} loading={busy} />
      <View style={{ alignItems: "center", gap: 12, marginTop: 8 }}>
        <Link href="/forgot-password" accessibilityRole="link" accessibilityLabel={t("auth.login.forgotLabel")}><Text tone="secondary" variant="bodyStrong">{t("auth.login.forgot")}</Text></Link>
        <Link href="/signup" replace accessibilityRole="link" accessibilityLabel={t("auth.login.create")}><Text tone="muted">{t("auth.login.newHere")} <Text tone="primary" variant="bodyStrong">{t("auth.login.create")}</Text></Text></Link>
      </View>
    </Screen>
  );
}
