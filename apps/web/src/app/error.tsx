"use client";

import { ErrorState } from "@/components/ui";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-lg px-4 py-24">
      <ErrorState message="We hit an unexpected problem. It's on us, not you." onRetry={reset} />
    </main>
  );
}
