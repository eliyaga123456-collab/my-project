import Link from "next/link";
import { ButtonLink, Logo } from "@/components/ui";
import { getT } from "@/i18n/server";
import { ThemeToggle } from "./ThemeToggle";

export async function SiteHeader({ cta = true }: { cta?: boolean }) {
  const { t } = await getT();
  return (
    <header className="relative z-20 mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
      <Link href="/" aria-label={t("common.nav.home")} className="rounded-full"><Logo /></Link>
      <nav aria-label={t("site.nav.main")} className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        {cta && <ButtonLink href="/install" size="sm" className="inline-flex">{t("common.nav.getTheApp")}</ButtonLink>}
      </nav>
    </header>
  );
}
