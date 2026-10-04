import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotForm } from "@/components/auth/ForgotForm";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("auth.forgot.metaTitle"), robots: { index: false } };
}

export default async function ForgotPage() {
  const { t } = await getT();
  return (
    <AuthCard title={t("auth.forgot.title")} subtitle={t("auth.forgot.subtitle")} footer={<Link href="/login" className="font-semibold text-fg underline underline-offset-4">{t("auth.forgot.back")}</Link>}>
      <ForgotForm />
    </AuthCard>
  );
}
