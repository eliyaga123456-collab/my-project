import type { ReactNode } from "react";
import Link from "next/link";
import { ButtonLink, Logo } from "@/components/ui";
import { ThemeToggle } from "@/components/site/ThemeToggle";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grain relative isolate min-h-dvh overflow-x-clip">
      <div className="blob animate-drift -left-32 -top-24 -z-10 size-96" style={{ background: "#ff7440" }} />
      <div className="blob animate-drift -right-32 top-1/3 -z-10 size-[28rem]" style={{ background: "#6d62f2", animationDelay: "-7s" }} />
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Unsaid home"><Logo /></Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <ButtonLink href="/signup" size="sm" variant="outline">Make your own link</ButtonLink>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-20 pt-4 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-10 text-center text-xs text-muted sm:px-6">
        <Link href="/privacy" className="underline-offset-4 hover:underline">Privacy</Link> · <Link href="/terms" className="underline-offset-4 hover:underline">Terms</Link> · <Link href="/safety" className="underline-offset-4 hover:underline">Safety</Link>
      </footer>
    </div>
  );
}
