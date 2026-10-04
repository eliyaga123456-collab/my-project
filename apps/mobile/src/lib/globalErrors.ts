/** Logs errors and keeps the app alive for non-fatal ones. Installed once from the root layout. */
type Handler = (error: unknown, isFatal?: boolean) => void;
interface ErrorUtilsLike { getGlobalHandler?: () => Handler; setGlobalHandler?: (h: Handler) => void }

let installed = false;

/** Builds the handler; `previous` is the default one (red box in dev, process exit for fatal errors in release). */
export function makeGlobalHandler(previous: Handler | undefined, log: (...a: unknown[]) => void = console.warn): Handler {
  return (error, isFatal) => {
    log("[EAR] uncaught error", isFatal ? "(fatal)" : "", error);
    // Non-fatal: swallow in release (the user keeps using the app). In dev keep the red box.
    if (!isFatal && !(typeof __DEV__ !== "undefined" && __DEV__)) return;
    // Fatal render errors reach the ErrorBoundary first; anything else falls through to the default behaviour.
    try { previous?.(error, isFatal); } catch { /* ignore */ }
  };
}

export function installGlobalErrorHandler(): void {
  if (installed) return;
  installed = true;
  try {
    const EU = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
    if (EU?.setGlobalHandler) EU.setGlobalHandler(makeGlobalHandler(EU.getGlobalHandler?.()));
  } catch { /* unsupported runtime */ }
  // Unhandled promise rejections: Hermes' tracker only warns, but make sure they are logged and never thrown.
  try {
    const g = globalThis as { addEventListener?: (t: string, cb: (e: unknown) => void) => void };
    g.addEventListener?.("unhandledrejection", (e) => { console.warn("[EAR] unhandled rejection", (e as { reason?: unknown })?.reason); });
  } catch { /* not supported */ }
}
