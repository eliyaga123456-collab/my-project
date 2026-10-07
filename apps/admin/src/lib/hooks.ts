import { useCallback, useEffect, useRef, useState } from "react";
import type { Page } from "@unsaid/shared";
import { errorMessage } from "./client";

export interface AsyncState<T> { data: T | null; error: string | null; loading: boolean; reload: (silent?: boolean) => void; }

/** Runs `fn` on mount / when `deps` change; ignores stale responses. `silent` reloads keep current data visible. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const run = useCallback((silent = false) => {
    const id = ++seq.current;
    if (!silent) { setLoading(true); setError(null); }
    fnRef.current().then(
      (d) => { if (id === seq.current) { setData(d); setError(null); setLoading(false); } },
      (e) => { if (id === seq.current) { setError(errorMessage(e)); setLoading(false); } }
    );
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(false); return () => { seq.current++; }; }, deps);
  return { data, error, loading, reload: run };
}

export interface PagedState<T> {
  items: T[]; setItems: React.Dispatch<React.SetStateAction<T[]>>;
  loading: boolean; loadingMore: boolean; error: string | null; moreError: string | null; hasMore: boolean;
  loadMore: () => void; reload: () => void;
}

/** Cursor pagination. */
export function usePaged<T>(fetchPage: (cursor?: string) => Promise<Page<T>>, deps: unknown[]): PagedState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const seq = useRef(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const cursorRef = useRef<string | null>(null);
  cursorRef.current = cursor;

  const reload = useCallback(() => {
    const id = ++seq.current;
    setLoading(true); setError(null); setMoreError(null); setLoadingMore(false);
    fetchRef.current().then(
      (p) => { if (id === seq.current) { setItems(p.items); setCursor(p.nextCursor); setLoading(false); } },
      (e) => { if (id === seq.current) { setError(errorMessage(e)); setLoading(false); } }
    );
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); return () => { seq.current++; }; }, deps);

  const loadMore = useCallback(() => {
    const c = cursorRef.current;
    if (!c) return;
    const id = seq.current;
    setLoadingMore(true); setMoreError(null);
    fetchRef.current(c).then(
      (p) => { if (id === seq.current) { setItems((prev) => [...prev, ...p.items.filter((n) => !prev.some((o) => (o as { id?: string }).id !== undefined && (o as { id?: string }).id === (n as { id?: string }).id))]); setCursor(p.nextCursor); setLoadingMore(false); } },
      (e) => { if (id === seq.current) { setMoreError(errorMessage(e)); setLoadingMore(false); } }
    );
  }, []);
  return { items, setItems, loading, loadingMore, error, moreError, hasMore: cursor !== null, loadMore, reload };
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function useTheme(): [string, () => void] {
  const [theme, setTheme] = useState<string>(() => {
    try { const t = localStorage.getItem("unsaid-admin-theme"); if (t === "light" || t === "dark") return t; } catch { /* storage unavailable */ }
    return "dark";
  });
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const toggle = useCallback(() => setTheme((t) => {
    const root = document.documentElement;
    root.classList.add("theme-anim");
    window.setTimeout(() => root.classList.remove("theme-anim"), 600);
    const n = t === "dark" ? "light" : "dark";
    try { localStorage.setItem("unsaid-admin-theme", n); } catch { /* ignore */ }
    return n;
  }), []);
  return [theme, toggle];
}
