import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserDto } from "@unsaid/shared";
import { client, errorMessage, setUnauthorizedHandler } from "./lib/client";
import { isStaff } from "./lib/format";

type Phase = "loading" | "anonymous" | "ready";
interface AuthCtx {
  phase: Phase;
  user: UserDto | null;
  notAuthorised: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  dismissNotAuthorised: () => void;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [user, setUser] = useState<UserDto | null>(null);
  const [notAuthorised, setNotAuthorised] = useState(false);

  const clear = useCallback(() => { setUser(null); setPhase("anonymous"); }, []);

  useEffect(() => {
    setUnauthorizedHandler(clear);
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  useEffect(() => {
    let alive = true;
    client.auth.me().then(
      async (me) => {
        if (!alive) return;
        if (isStaff(me.user.role)) { setUser(me.user); setPhase("ready"); return; }
        setNotAuthorised(true);
        await client.auth.logout().catch(() => undefined);
        if (alive) clear();
      },
      () => { if (alive) clear(); }
    );
    return () => { alive = false; };
  }, [clear]);

  const login = useCallback(async (email: string, password: string) => {
    setNotAuthorised(false);
    await client.auth.login({ email, password });
    let me;
    try { me = await client.auth.me(); } catch (e) { throw new Error(errorMessage(e)); }
    if (!isStaff(me.user.role)) {
      await client.auth.logout().catch(() => undefined);
      setNotAuthorised(true);
      clear();
      return;
    }
    setUser(me.user);
    setPhase("ready");
  }, [clear]);

  const logout = useCallback(async () => {
    await client.auth.logout().catch(() => undefined);
    clear();
  }, [clear]);

  const value = useMemo<AuthCtx>(() => ({ phase, user, notAuthorised, login, logout, dismissNotAuthorised: () => setNotAuthorised(false) }), [phase, user, notAuthorised, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
