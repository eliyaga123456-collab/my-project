import Link from "next/link";
import { Logo } from "@/components/ui";
import { getT } from "@/i18n/server";
import { LanguageSwitcher } from "./LanguageSwitcher";

export async function SiteFooter() {
  const { t } = await getT();
  const links = [
    { href: "/install", label: t("common.nav.getTheApp") },
    { href: "/about", label: t("site.nav.about") },
    { href: "/privacy", label: t("site.nav.privacy") },
    { href: "/terms", label: t("site.nav.terms") },
    { href: "/safety", label: t("site.nav.safety") },
    { href: "/contact", label: t("site.nav.contact") },
    { href: "/delete-account", label: t("site.deleteAccount.title") }
  ];
  return (
    <footer className="relative z-10 mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo size={26} />
          <p className="mt-2 max-w-xs text-sm text-muted">{t("site.footer.blurb")}</p>
        </div>
        <nav aria-label={t("site.nav.footer")} className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {links.map((l) => <Link key={l.href} href={l.href} className="text-muted underline-offset-4 hover:text-fg hover:underline">{l.label}</Link>)}
        </nav>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-10 text-xs text-muted sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p>{t("site.footer.copyright", { year: new Date().getFullYear() })}</p>
          <p id="dedication" className="mt-1.5 font-medium text-fg/80">{t("common.brand.dedication")}<span className="sr-only">{t("site.footer.withLove")}</span></p>
        </div>
        <LanguageSwitcher />
      </div>
    </footer>
  );
}
