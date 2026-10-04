"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Bell, Inbox, Link2, LogOut, Settings } from "lucide-react";
import type { MeDto } from "@unsaid/shared";
import { api } from "@/lib/api";
import { Avatar, CountBadge, Dropdown, Logo, useToast, cx } from "@/components/ui";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { MeProvider, useMe } from "./MeProvider";
import { VerifyBanner } from "./VerifyBanner";

const items = [
  { href: "/inbox", label: "Inbox", icon: Inbox, count: "messages" as const },
  { href: "/links", label: "Links", icon: Link2 },
  { href: "/notifications", label: "Alerts", full: "Notifications", icon: Bell, count: "notifications" as const },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings }
];

function Shell({ children }: { children: ReactNode }) {
  const { me } = useMe();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const counts = { messages: me.unreadMessages, notifications: me.unreadNotifications };
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  async function logout() {
    try { await api.auth.logout(); } catch { /* session may already be gone */ }
    toast.info("Logged out");
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/inbox" aria-label="Unsaid inbox" className="rounded-full"><Logo /></Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active(it.href) ? "page" : undefined}
                className={cx("inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition", active(it.href) ? "bg-raised text-fg" : "text-muted hover:text-fg")}
              >
                <it.icon className="size-4" aria-hidden />{"full" in it ? it.full : it.label}
                {it.count && <CountBadge count={counts[it.count]} label="unread" />}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Dropdown
              label="Account menu"
              triggerClassName="rounded-full"
              trigger={<Avatar name={me.profile.displayName} src={me.profile.avatarUrl} size={40} />}
              items={[
                { id: "profile", label: "View public page", icon: <Link2 className="size-4" />, onSelect: () => window.open(`/u/${me.profile.username}`, "_blank", "noopener") },
                { id: "settings", label: "Settings", icon: <Settings className="size-4" />, onSelect: () => router.push("/settings") },
                { id: "logout", label: "Log out", icon: <LogOut className="size-4" />, danger: true, onSelect: logout }
              ]}
            />
          </div>
        </div>
      </header>
      <VerifyBanner />
      <main id="main" className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>

      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {items.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active(it.href) ? "page" : undefined}
                className={cx("relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-semibold transition", active(it.href) ? "text-fg" : "text-muted")}
              >
                <span className="relative">
                  <it.icon className={cx("size-6", active(it.href) && "text-primary")} aria-hidden />
                  {it.count && counts[it.count] > 0 && <span className="absolute -right-2.5 -top-2"><CountBadge count={counts[it.count]} label="unread" /></span>}
                </span>
                {it.label}
                {active(it.href) && <span aria-hidden className="grad-bg absolute top-0 h-0.5 w-8 rounded-full" />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function AppShell({ me, children }: { me: MeDto; children: ReactNode }) {
  return (
    <MeProvider initial={me}>
      <Shell>{children}</Shell>
    </MeProvider>
  );
}
