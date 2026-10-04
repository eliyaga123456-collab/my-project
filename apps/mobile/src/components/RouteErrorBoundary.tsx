import { CrashScreen } from "./AppErrorBoundary";

/** Per-section expo-router ErrorBoundary: a crash in tabs / settings / a message keeps the rest of the app navigable. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return <CrashScreen error={error} retry={retry} />;
}
