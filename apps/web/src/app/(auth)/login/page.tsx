import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { getMe } from "@/lib/server-api";
import { safeNext } from "@/lib/format";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getMe()) redirect(safeNext(next));
  return (
    <AuthCard title="Welcome back" subtitle="Log in to read what people left for you." footer={<>New here? <Link href="/signup" className="font-semibold text-fg underline underline-offset-4">Create your profile</Link></>}>
      <LoginForm next={next} />
    </AuthCard>
  );
}
