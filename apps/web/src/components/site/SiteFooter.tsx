import Link from "next/link";
import { Logo } from "@/components/ui";

const links = [
  { href: "/install", label: "Get the app" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/safety", label: "Safety" },
  { href: "/contact", label: "Contact" }
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo size={26} />
          <p className="mt-2 max-w-xs text-sm text-muted">Say what you really think. Kindly. Nothing is ever traced back to a sender&apos;s name.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {links.map((l) => <Link key={l.href} href={l.href} className="text-muted underline-offset-4 hover:text-fg hover:underline">{l.label}</Link>)}
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-10 text-xs text-muted sm:px-6">
        <p>&copy; {new Date().getFullYear()} EAR &mdash; Eliya&apos;s Anonymous Replies. An original product.</p>
        <p id="dedication" className="mt-1.5 font-medium text-fg/80">* For Liron <span aria-hidden="true">&#128155;</span><span className="sr-only">, with love</span></p>
      </div>
    </footer>
  );
}
