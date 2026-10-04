import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LoginInput, MeDto, RegisterInput } from "@unsaid/shared";
import { ApiError } from "@unsaid/api-client";
import { api, clearToken, loadToken, saveToken, setUnauthorizedHandler } from "@/lib/api";
import { registerForPush, unregisterPush } from "@/lib/push";

type Status = "loading" | "authed" | "anon";
interface AuthApi {
  status: Status;
  me: MeDto | null;
  login: (i: LoginInput) => Promise<void>;
  register: (i: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  patchMe: (fn: (m: MeDto) => MeDto) => void;
}
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
    if (!res.token) throw new ApiError("server_error", "The server did not return a session token.", 500);
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

  // Restore session.
  useEffect(() => {
    let alive = true;
    (async () => {
      const token = await loadToken();
      if (!token) { if (alive) setStatus("anon"); return; }
      try {
        const m = await api.auth.me();
        if (!alive) return;
        setMe(m);
        setStatus("authed");
      } catch (e) {
        if (!alive) return;
        // Keep the token on transient failures; drop it on real auth errors.
        if (e instanceof ApiError && e.code === "network_error") { setStatus("anon"); return; }
        await clearToken();
        setStatus("anon");
      }
    })();
    return () => { alive = false; };
  }, []);

  // Register push token once authenticated.
  useEffect(() => { if (status === "authed") void registerForPush(); }, [status]);

  const login = useCallback(async (i: LoginInput) => { await applySession(await api.auth.login(i)); }, [applySession]);
  const register = useCallback(async (i: RegisterInput) => { await applySession(await api.auth.register(i)); }, [applySession]);
  const logout = useCallback(async () => {
    await unregisterPush();
    try { await api.auth.logout(); } catch { /* revoke best-effort; local session is dropped regardless */ }
    await clearToken();
    setMe(null);
    setStatus("anon");
  }, []);
  const refreshMe = useCallback(async () => { setMe(await api.auth.me()); }, []);
  const patchMe = useCallback((fn: (m: MeDto) => MeDto) => setMe((m) => (m ? fn(m) : m)), []);

  const value = useMemo(() => ({ status, me, login, register, logout, refreshMe, patchMe }), [status, me, login, register, logout, refreshMe, patchMe]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
