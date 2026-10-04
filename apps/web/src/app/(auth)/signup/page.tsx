import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { AppRecommend } from "@/components/auth/AppRecommend";
import { SignupForm } from "@/components/auth/SignupForm";
import { getT } from "@/i18n/server";
import { getMe } from "@/lib/server-api";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("auth.signup.metaTitle"), robots: { index: false } };
}

export default async function SignupPage() {
  if (await getMe()) redirect("/inbox");
  const { t } = await getT();
  return (
    <AuthCard title={t("auth.signup.title")} subtitle={t("auth.signup.subtitle")} footer={<>{t("auth.signup.haveAccount")} <Link href="/login" className="font-semibold text-fg underline underline-offset-4">{t("auth.signup.logIn")}</Link></>}>
      <SignupForm />
      <AppRecommend />
    </AuthCard>
  );
}
