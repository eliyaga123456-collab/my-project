import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { VerifyEmail } from "@/components/auth/VerifyEmail";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("auth.verify.metaTitle"), robots: { index: false } };
}

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const { t } = await getT();
  return (
    <AuthCard title={t("auth.verify.title")}>
      <VerifyEmail token={token} />
    </AuthCard>
  );
}
