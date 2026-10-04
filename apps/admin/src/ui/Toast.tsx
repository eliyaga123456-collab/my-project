import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type Kind = "success" | "error";
interface ToastItem { id: number; kind: Kind; message: string; }
interface ToastApi { success: (m: string) => void; error: (m: string) => void; }
const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
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
        <div className="toasts" role="region" aria-label="Notifications" aria-live="polite">
          {items.map((t) => (
            <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === "error" ? "alert" : "status"}>
              {t.kind === "success" ? <CheckCircle2 size={18} aria-hidden /> : <AlertCircle size={18} aria-hidden />}
              <span>{t.message}</span>
              <button type="button" className="icon-btn" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}><X size={16} aria-hidden /></button>
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
