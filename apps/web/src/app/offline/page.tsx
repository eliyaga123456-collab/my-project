import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

export default function Offline() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <WifiOff className="mx-auto size-12 text-muted" aria-hidden />
        <h1 className="mt-4 text-3xl font-extrabold">You&apos;re offline</h1>
        <p className="mt-2 max-w-sm text-muted">EAR needs a connection to show your messages. Reconnect and try again — nothing is lost.</p>
        <a href="/" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-on-primary">Try again</a>
      </div>
    </main>
  );
}
