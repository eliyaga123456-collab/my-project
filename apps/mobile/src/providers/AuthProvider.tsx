import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LoginInput, MeDto, RegisterInput } from "@unsaid/shared";
import { ApiError } from "@unsaid/api-client";
import { api, clearToken, loadToken, saveToken, setUnauthorizedHandler } from "@/lib/api";
import { registerForPush, unregisterPush } from "@/lib/push";
import { translate } from "@/i18n/core";
import { isTransient } from "@/lib/errors";

type Status = "loading" | "authed" | "anon";
interface AuthApi {
  status: Status;
  me: MeDto | null;
  login: (i: LoginInput) => Promise<void>;
  register: (i: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  patchMe: (fn: (m: MeDto) => MeDto) => void;
  /** True when restoring the saved session failed for connectivity reasons (status stays "loading"); call retryBoot to try again. */
  bootFailed: boolean;
  retryBoot: () => void;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const AuthContext = createContext<AuthApi | null>(null);

export function useAuth(): AuthApi {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<MeDto | null>(null);
  const statusRef = useRef<Status>("loading");
  statusRef.current = status;

  const applySession = useCallback(async (res: MeDto & { token?: string }) => {
    if (!res.token) throw new ApiError("server_error", translate("errors.serverNoToken"), 500);
    await saveToken(res.token);
    const { token: _token, ...rest } = res;
    setMe(rest);
    setStatus("authed");
  }, []);

  // 401 anywhere => drop the session locally.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (statusRef.current !== "authed") return;
      void clearToken();
      setMe(null);
      setStatus("anon");
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Restore session. A cold-starting server or a flaky network must NOT log the user out: keep the token and retry.
  const [bootFailed, setBootFailed] = useState(false);
  const [bootTry, setBootTry] = useState(0);
  useEffect(() => {
    let alive = true;
    setBootFailed(false);
    (async () => {
      const token = await loadToken();
      if (!token) { if (alive) setStatus("anon"); return; }
      for (let attempt = 0; attempt < 4 && alive; attempt++) {
        try {
          const m = await api.auth.me();
          if (!alive) return;
          setMe(m);
          setStatus("authed");
          return;
        } catch (e) {
          if (!alive) return;
          if (!isTransient(e)) { await clearToken(); if (alive) setStatus("anon"); return; }
          await sleep(1500 * (attempt + 1));
        }
      }
      if (alive) setBootFailed(true);
    })().catch(() => { if (alive) setStatus("anon"); });
    return () => { alive = false; };
  }, [bootTry]);
  const retryBoot = useCallback(() => setBootTry((n) => n + 1), []);

  // Register push token once authenticated.
  useEffect(() => { if (status === "authed") registerForPush().catch(() => undefined); }, [status]);

  const login = useCallback(async (i: LoginInput) => { await applySession(await api.auth.login(i)); }, [applySession]);
  const register = useCallback(async (i: RegisterInput) => { await applySession(await api.auth.register(i)); }, [applySession]);
  const logout = useCallback(async () => {
    try { await unregisterPush(); } catch { /* best effort */ }
    try { await api.auth.logout(); } catch { /* revoke best-effort; local session is dropped regardless */ }
    await clearToken();
    setMe(null);
    setStatus("anon");
  }, []);
  const refreshMe = useCallback(async () => { setMe(await api.auth.me()); }, []);
  const patchMe = useCallback((fn: (m: MeDto) => MeDto) => setMe((m) => (m ? fn(m) : m)), []);

  const value = useMemo(() => ({ status, me, login, register, logout, refreshMe, patchMe, bootFailed, retryBoot }), [status, me, login, register, logout, refreshMe, patchMe, bootFailed, retryBoot]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
