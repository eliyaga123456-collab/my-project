import { useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorState";
import { IconButton } from "@/components/IconButton";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAuth } from "@/providers/AuthProvider";
import { useNetwork } from "@/providers/NetworkProvider";
import { errorMessage } from "@/lib/errors";
import { validateEmail } from "@/lib/validation";

export default function Login() {
  const router = useRouter();
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
    if (!e.ok || password.length === 0) { if (e.ok) setError("Enter your password"); return; }
    setBusy(true); setError(null);
    try { await login({ email: e.value, password }); } catch (err) { setError(errorMessage(err)); report(err); setBusy(false); }
  };

  return (
    <Screen>
      <IconButton icon="chevron" label="Back" onPress={() => router.back()} style={{ transform: [{ scaleX: -1 }], marginLeft: -8 }} />
      <Text variant="title">Welcome back</Text>
      <Text tone="muted">Sign in to see what people left for you.</Text>
      {error ? <ErrorBanner message={error} /> : null}
      <Input label="Email" value={email} onChangeText={setEmail} error={emailError} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" returnKeyType="next" onSubmitEditing={() => pw.current?.focus()} />
      <Input ref={pw} label="Password" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" autoComplete="current-password" returnKeyType="go" onSubmitEditing={submit} />
      <Button title="Sign in" onPress={submit} loading={busy} />
      <View style={{ alignItems: "center", gap: 12, marginTop: 8 }}>
        <Link href="/forgot-password" accessibilityRole="link" accessibilityLabel="Forgot password"><Text tone="secondary" variant="bodyStrong">Forgot password?</Text></Link>
        <Link href="/signup" replace accessibilityRole="link" accessibilityLabel="Create an account"><Text tone="muted">New here? <Text tone="primary" variant="bodyStrong">Create an account</Text></Text></Link>
      </View>
    </Screen>
  );
}
