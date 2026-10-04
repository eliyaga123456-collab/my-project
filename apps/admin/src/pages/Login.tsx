import { useState, type FormEvent } from "react";
import { Moon, ShieldOff, Sun } from "lucide-react";
import { useAuth } from "../auth";
import { errorMessage } from "../lib/client";
import { useTheme } from "../lib/hooks";
import { Button, IconButton } from "../ui";

export function Login() {
  const { login, notAuthorised, dismissNotAuthorised } = useAuth();
  const [theme, toggleTheme] = useTheme();
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
      <div className="login-theme"><IconButton label="Toggle theme" onClick={toggleTheme}>{theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}</IconButton></div>
      <form className="login-card" onSubmit={submit} noValidate>
        <span className="brand-mark big">Unsaid <em>admin</em></span>
        <h1 className="login-title">Sign in</h1>
        <p className="muted">Moderators and admins only.</p>
        {notAuthorised && (
          <div className="notice notice-danger" role="alert">
            <ShieldOff size={18} aria-hidden />
            <div>
              <strong>Not authorised</strong>
              <p>This account doesn't have admin or moderator access. You've been signed out.</p>
              <button type="button" className="link" onClick={dismissNotAuthorised}>Dismiss</button>
            </div>
          </div>
        )}
        <label className="field">
          <span className="field-label">Email</span>
          <input className="input" type="email" autoComplete="username" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="text-danger" role="alert">{error}</p>}
        <Button type="submit" variant="primary" loading={busy} disabled={!email || !password}>Sign in</Button>
      </form>
    </div>
  );
}
