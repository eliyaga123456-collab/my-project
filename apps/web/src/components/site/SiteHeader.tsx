import Link from "next/link";
import { ButtonLink, Logo } from "@/components/ui";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader({ cta = true }: { cta?: boolean }) {
  return (
    <header className="relative z-20 mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
      <Link href="/" aria-label="Unsaid home" className="rounded-full"><Logo /></Link>
      <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <ButtonLink href="/login" variant="ghost" size="sm">Log in</ButtonLink>
        {cta && <ButtonLink href="/signup" size="sm" className="hidden xs:inline-flex">Get your link</ButtonLink>}
      </nav>
    </header>
  );
}
