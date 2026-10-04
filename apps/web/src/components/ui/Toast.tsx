"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cx } from "./cx";

type Kind = "success" | "error" | "info";
interface ToastItem { id: number; kind: Kind; message: string }
interface ToastApi { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void }

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used inside <ToastProvider>");
  return v;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((kind: Kind, message: string) => {
    const id = ++seq.current;
    setItems((l) => [...l.slice(-3), { id, kind, message }]);
    window.setTimeout(() => dismiss(id), kind === "error" ? 7000 : 4000);
  }, [dismiss]);

  const api = useMemo<ToastApi>(() => ({
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m)
  }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={cx(
              "animate-pop pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border bg-surface p-3.5 pr-2 shadow-[var(--shadow)]",
              t.kind === "success" && "border-success/40",
              t.kind === "error" && "border-danger/50",
              t.kind === "info" && "border-line"
            )}
          >
            {t.kind === "success" && <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />}
            {t.kind === "error" && <XCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />}
            {t.kind === "info" && <Info className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden />}
            <p className="flex-1 text-sm leading-snug">{t.message}</p>
            <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(t.id)} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-raised hover:text-fg">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
