import { useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { ApiError } from "@unsaid/api-client";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorState";
import { Icon } from "@/components/Icon";
import { IconButton } from "@/components/IconButton";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { api } from "@/lib/api";
import { WEB_URL } from "@/lib/env";
import { errorMessage } from "@/lib/errors";
import { fieldErrors, passwordRules, validateEmail, validatePassword, validateUsername } from "@/lib/validation";
import { useT } from "@/i18n";
import { useAuth } from "@/providers/AuthProvider";
import { useNetwork } from "@/providers/NetworkProvider";

type Avail = "idle" | "checking" | "available" | "taken" | "error";

export default function Signup() {
  const router = useRouter();
  const { t, locale } = useT();
  const { register } = useAuth();
  const { report } = useNetwork();
  const emailRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avail, setAvail] = useState<Avail>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const uname = validateUsername(username);
  useEffect(() => {
    if (username.length === 0 || !uname.ok) { setAvail("idle"); return; }
    setAvail("checking");
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const r = await api.auth.usernameAvailable(uname.value);
        if (alive) setAvail(r.available ? "available" : "taken");
      } catch (e) { if (alive) { setAvail("error"); report(e); } }
    }, 400);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const usernameHint =
    username.length === 0 ? t("auth.signup.yourLink", { url: `${WEB_URL.replace(/^https?:\/\//, "")}/u/yourname` }) :
    !uname.ok ? null :
    avail === "checking" ? t("auth.signup.checking") : avail === "available" ? t("auth.signup.available") : avail === "taken" ? null : avail === "error" ? t("auth.signup.checkFailed") : null;
  const usernameError = username.length > 0 && !uname.ok ? uname.error : avail === "taken" ? t("auth.signup.taken") : errors.username ?? null;

  const rules = passwordRules(password);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!uname.ok) e.username = uname.error;
    const em = validateEmail(email);
    if (!em.ok) e.email = em.error;
    const pw = validatePassword(password);
    if (!pw.ok) e.password = pw.error;
    setErrors(e);
    if (!uname.ok || !em.ok || !pw.ok || avail === "taken") return;
    setBusy(true); setError(null);
    try {
      await register({ username: uname.value, email: em.value, password: pw.value, locale });
    } catch (err) {
      if (err instanceof ApiError && err.code === "validation_error") setErrors(fieldErrors(err));
      if (err instanceof ApiError && err.code === "conflict") setError(t("auth.signup.conflict"));
      else setError(errorMessage(err));
      report(err);
      setBusy(false);
    }
  };

  return (
    <Screen>
      <IconButton icon="chevron" dir="back" label={t("common.back")} onPress={() => router.back()} style={{ marginStart: -8 }} />
      <Text variant="title">{t("auth.signup.title")}</Text>
      <Text tone="muted">{t("auth.signup.subtitle")}</Text>
      {error ? <ErrorBanner message={error} /> : null}
      <Input
        ltr label={t("auth.username")} value={username} onChangeText={(t) => setUsername(t.toLowerCase())} error={usernameError} hint={usernameHint}
        autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} maxLength={24}
        right={avail === "available" ? <View style={{ paddingEnd: 12 }}><Icon name="check" size={20} tone="success" /></View> : undefined}
      />
      <Input ltr ref={emailRef} label={t("auth.email")} value={email} onChangeText={setEmail} error={errors.email} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" returnKeyType="next" onSubmitEditing={() => pwRef.current?.focus()} />
      <Input ltr ref={pwRef} label={t("auth.password")} value={password} onChangeText={setPassword} error={errors.password} secureTextEntry textContentType="newPassword" autoComplete="new-password" returnKeyType="go" onSubmitEditing={submit} />
      <View style={{ gap: 4 }} accessibilityLabel={t("auth.signup.rulesLabel")}>
        {rules.map((r) => (
          <View key={r.id} style={{ flexDirection: "row", gap: 8, alignItems: "center" }} accessible accessibilityLabel={t(r.met ? "auth.signup.ruleMet" : "auth.signup.ruleNotMet", { rule: r.label })}>
            <Icon name={r.met ? "check" : "close"} size={14} tone={r.met ? "success" : "muted"} />
            <Text variant="caption" tone={r.met ? "success" : "muted"}>{r.label}</Text>
          </View>
        ))}
      </View>
      <Button title={t("auth.signup.submit")} onPress={submit} loading={busy} />
      <Link href="/login" replace accessibilityRole="link" accessibilityLabel={t("auth.signup.signInInstead")} style={{ alignSelf: "center" }}><Text tone="muted">{t("auth.signup.haveAccount")} <Text tone="primary" variant="bodyStrong">{t("auth.signup.signIn")}</Text></Text></Link>
    </Screen>
  );
}
