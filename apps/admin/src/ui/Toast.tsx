import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useT } from "../i18n";

type Kind = "success" | "error";
interface ToastItem { id: number; kind: Kind; message: string; }
interface ToastApi { success: (m: string) => void; error: (m: string) => void; }
const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((kind: Kind, message: string) => {
    const id = nextId.current++;
    setItems((l) => [...l.slice(-3), { id, kind, message }]);
    setTimeout(() => dismiss(id), kind === "error" ? 7000 : 4000);
  }, [dismiss]);
  const api = useMemo<ToastApi>(() => ({ success: (m) => push("success", m), error: (m) => push("error", m) }), [push]);
  return (
    <Ctx.Provider value={api}>
      {children}
      {createPortal(
        <div className="toasts" role="region" aria-label={t("common.notifications")} aria-live="polite">
          {items.map((it) => (
            <div key={it.id} className={`toast toast-${it.kind}`} role={it.kind === "error" ? "alert" : "status"}>
              {it.kind === "success" ? <CheckCircle2 size={18} aria-hidden /> : <AlertCircle size={18} aria-hidden />}
              <span>{it.message}</span>
              <button type="button" className="icon-btn" aria-label={t("common.dismissNotification")} onClick={() => dismiss(it.id)}><X size={16} aria-hidden /></button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast outside ToastProvider");
  return c;
}
