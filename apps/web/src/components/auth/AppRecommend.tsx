import Link from "next/link";
import { Smartphone } from "lucide-react";
import { getT } from "@/i18n/server";
import { rich } from "@/lib/rich";

/** Sign-up / log-in notice: on Android the native app is the recommended home for the account. */
export async function AppRecommend() {
  const { t } = await getT();
  return (
    <p className="mt-4 flex gap-2 rounded-md bg-raised px-3 py-2.5 text-sm text-muted" data-testid="android-note">
      <Smartphone className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden />
      <span>{rich(t("auth.androidNote"), { link: (c) => <Link href="/install" className="font-semibold text-fg underline underline-offset-4">{c}</Link> })}</span>
    </p>
  );
}
