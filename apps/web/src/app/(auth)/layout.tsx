import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { getT } from "@/i18n/server";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = await getT();
  return (
    <div className="grain relative isolate min-h-dvh overflow-x-clip">
      <div className="blob animate-drift -left-24 -top-24 -z-10 size-96" style={{ background: "#ff7440" }} />
      <div className="blob animate-drift -bottom-24 -right-24 -z-10 size-[26rem]" style={{ background: "var(--grad-3)", animationDelay: "-5s" }} />
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label={t("common.nav.home")}><Logo /></Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher compact />
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-md flex-col px-4 pb-16 pt-6 sm:pt-12">{children}</main>
    </div>
  );
}
