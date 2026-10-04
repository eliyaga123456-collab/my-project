import { ButtonLink } from "@/components/ui";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto grid min-h-[60dvh] max-w-md place-items-center px-4 text-center">
        <div className="animate-ink-in">
          <p className="grad-text font-display text-7xl font-extrabold">404</p>
          <h1 className="mt-2 text-2xl font-bold">{t("site.notFound.title")}</h1>
          <p className="mt-2 text-muted">{t("site.notFound.body")}</p>
          <ButtonLink href="/" className="mt-6">{t("site.notFound.back")}</ButtonLink>
        </div>
      </main>
    </>
  );
}
