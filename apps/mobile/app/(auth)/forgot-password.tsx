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
import { useNetwork } from "@/providers/NetworkProvider";

export default function ForgotPassword() {
  const router = useRouter();
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
      <IconButton icon="chevron" label="Back" onPress={() => router.back()} style={{ transform: [{ scaleX: -1 }], marginLeft: -8 }} />
      <Text variant="title">Reset your password</Text>
      {sent ? (
        <Card accessibilityLiveRegion="polite" style={{ gap: 8 }}>
          <Text variant="heading">Check your inbox</Text>
          <Text tone="muted">If an account exists for {email.trim()}, we've sent a link to reset the password. Open it on this device or on the web.</Text>
          <Button title="Back to sign in" variant="secondary" onPress={() => router.replace("/login")} />
        </Card>
      ) : (
        <>
          <Text tone="muted">Enter the email you signed up with and we'll send you a reset link.</Text>
          {error ? <ErrorBanner message={error} /> : null}
          <Input label="Email" value={email} onChangeText={setEmail} error={emailError} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" returnKeyType="send" onSubmitEditing={submit} />
          <Button title="Send reset link" onPress={submit} loading={busy} />
        </>
      )}
    </Screen>
  );
}
