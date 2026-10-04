"use client";

import { ErrorState } from "@/components/ui";
import { useT } from "@/i18n/client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useT();
  return (
    <main id="main" className="mx-auto max-w-lg px-4 py-24">
      <ErrorState title={t("common.state.error")} message={t("site.error.body")} onRetry={reset} retryLabel={t("common.state.retry")} />
    </main>
  );
}
