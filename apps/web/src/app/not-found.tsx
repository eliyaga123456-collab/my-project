import { ButtonLink, Sparkles } from "@/components/ui";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <>
      <SiteHeader />
      <main id="main" className="relative isolate mx-auto grid min-h-[60dvh] max-w-md place-items-center px-4 text-center">
        <Sparkles />
        <div className="animate-ink-in">
          <p className="grad-text font-display text-8xl font-extrabold drop-shadow-[0_10px_30px_color-mix(in_srgb,var(--grad-2)_45%,transparent)]">404</p>
          <h1 className="mt-2 text-2xl font-bold">{t("site.notFound.title")}</h1>
          <p className="mt-2 text-muted">{t("site.notFound.body")}</p>
          <ButtonLink href="/" className="mt-6">{t("site.notFound.back")}</ButtonLink>
        </div>
      </main>
    </>
  );
}
