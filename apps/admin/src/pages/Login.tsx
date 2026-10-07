import { useState, type FormEvent } from "react";
import { ShieldOff } from "lucide-react";
import { useAuth } from "../auth";
import { errorMessage } from "../lib/client";
import { useT } from "../i18n";
import { Button, LanguageSwitcher, Logo, ThemeToggle } from "../ui";

export function Login() {
  const { login, notAuthorised, dismissNotAuthorised } = useAuth();
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await login(email.trim(), password); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <div className="login">
      <div className="login-theme"><LanguageSwitcher /><ThemeToggle /></div>
      <form className="login-card" onSubmit={submit} noValidate>
        <Logo className="login-logo" />
        <h1 className="login-title">{t("login.title")}</h1>
        <p className="muted">{t("login.subtitle")}</p>
        {notAuthorised && (
          <div className="notice notice-danger" role="alert">
            <ShieldOff size={18} aria-hidden />
            <div>
              <strong>{t("login.notAuthorisedTitle")}</strong>
              <p>{t("login.notAuthorisedBody")}</p>
              <button type="button" className="link" onClick={dismissNotAuthorised}>{t("login.dismiss")}</button>
            </div>
          </div>
        )}
        <label className="field">
          <span className="field-label">{t("login.email")}</span>
          <input className="input" dir="ltr" type="email" autoComplete="username" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span className="field-label">{t("login.password")}</span>
          <input className="input" dir="ltr" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="text-danger" role="alert">{error}</p>}
        <Button type="submit" variant="primary" loading={busy} disabled={!email || !password}>{t("login.submit")}</Button>
      </form>
    </div>
  );
}
