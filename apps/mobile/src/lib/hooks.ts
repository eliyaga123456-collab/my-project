import { useCallback, useEffect, useRef, useState } from "react";
import { useNetwork } from "@/providers/NetworkProvider";
import { errorMessage } from "./errors";

/** One-shot data loader with loading / error / refresh state; reports connectivity to the banner. */
export function useRequest<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const { report, ok } = useNetwork();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const run = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    const id = ++seq.current;
    if (mode === "initial") setLoading(true); else setRefreshing(true);
    try {
      const r = await fnRef.current();
      if (id !== seq.current) return;
      setData(r); setError(null); ok();
    } catch (e) {
      if (id !== seq.current) return;
      setError(errorMessage(e)); report(e);
    } finally {
      if (id === seq.current) { setLoading(false); setRefreshing(false); }
    }
  }, [ok, report]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void run(); }, deps);
  return { data, setData, error, loading, refreshing, reload: () => run("initial"), refresh: () => run("refresh") };
}
