"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { usePwaInstall } from "./usePwaInstall";
import { INSTALL_PATH } from "@/lib/site";
import { cx } from "@/components/ui";

/** "Get the app" entry point. Hidden once installed; always links to the install guide (works on every platform). */
export function InstallButton({ className, label = "Get the app" }: { className?: string; label?: string }) {
  const { installed, ready } = usePwaInstall();
  if (!ready || installed) return null;
  return (
    <Link href={INSTALL_PATH} className={cx("inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition hover:bg-raised hover:text-fg", className)}>
      <Download className="size-4" aria-hidden />{label}
    </Link>
  );
}
