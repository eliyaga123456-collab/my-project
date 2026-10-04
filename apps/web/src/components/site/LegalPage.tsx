import type { ReactNode } from "react";
import { getT } from "@/i18n/server";

export async function LegalPage({ title, intro, updated, children }: { title: string; intro: string; updated?: string; children: ReactNode }) {
  const { t } = await getT();
  return (
    <article className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-14">
      <h1 className="text-4xl font-extrabold sm:text-5xl">{title}</h1>
      <p className="mt-3 text-lg text-muted">{intro}</p>
      {updated && <p className="mt-2 text-sm text-muted">{t("site.legal.updated", { date: updated })}</p>}
      <div className="prose-unsaid mt-6">{children}</div>
    </article>
  );
}
