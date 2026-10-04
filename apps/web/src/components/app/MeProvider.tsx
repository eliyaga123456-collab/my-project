"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { MeDto } from "@unsaid/shared";
import { api } from "@/lib/api";

interface MeCtx { me: MeDto; setMe: (m: MeDto) => void; refresh: () => Promise<void> }
const Ctx = createContext<MeCtx | null>(null);

export function MeProvider({ initial, children }: { initial: MeDto; children: ReactNode }) {
  const [me, setMe] = useState(initial);
  const refresh = useCallback(async () => {
    try { setMe(await api.auth.me()); } catch { /* keep stale data; a 401 is handled by the client */ }
  }, []);
  const value = useMemo(() => ({ me, setMe, refresh }), [me, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMe(): MeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMe must be used inside <MeProvider>");
  return v;
}
