import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { AppRecommend } from "@/components/auth/AppRecommend";
import { LoginForm } from "@/components/auth/LoginForm";
import { getT } from "@/i18n/server";
import { getMe } from "@/lib/server-api";
import { safeNext } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("auth.login.metaTitle"), robots: { index: false } };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getMe()) redirect(safeNext(next));
  const { t } = await getT();
  return (
    <AuthCard title={t("auth.login.title")} subtitle={t("auth.login.subtitle")} footer={<>{t("auth.login.newHere")} <Link href="/signup" className="font-semibold text-fg underline underline-offset-4">{t("auth.login.createProfile")}</Link></>}>
      <LoginForm next={next} />
      <AppRecommend />
    </AuthCard>
  );
}
