import { useState } from "react";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorState";
import { IconButton } from "@/components/IconButton";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { validateEmail } from "@/lib/validation";
import { useT } from "@/i18n";
import { useNetwork } from "@/providers/NetworkProvider";

export default function ForgotPassword() {
  const router = useRouter();
  const { t } = useT();
  const { report } = useNetwork();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const e = validateEmail(email);
    setEmailError(e.ok ? null : e.error);
    if (!e.ok) return;
    setBusy(true); setError(null);
    try { await api.auth.forgotPassword(e.value); setSent(true); } catch (err) { setError(errorMessage(err)); report(err); }
    setBusy(false);
  };

  return (
    <Screen>
      <IconButton icon="chevron" dir="back" label={t("common.back")} onPress={() => router.back()} style={{ marginStart: -8 }} />
      <Text variant="title">{t("auth.forgot.title")}</Text>
      {sent ? (
        <Card accessibilityLiveRegion="polite" style={{ gap: 8 }}>
          <Text variant="heading">{t("auth.forgot.sentTitle")}</Text>
          <Text tone="muted">{t("auth.forgot.sentBody", { email: email.trim() })}</Text>
          <Button title={t("auth.forgot.backToLogin")} variant="secondary" onPress={() => router.replace("/login")} />
        </Card>
      ) : (
        <>
          <Text tone="muted">{t("auth.forgot.intro")}</Text>
          {error ? <ErrorBanner message={error} /> : null}
          <Input ltr label={t("auth.email")} value={email} onChangeText={setEmail} error={emailError} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" returnKeyType="send" onSubmitEditing={submit} />
          <Button title={t("auth.forgot.submit")} onPress={submit} loading={busy} />
        </>
      )}
    </Screen>
  );
}
