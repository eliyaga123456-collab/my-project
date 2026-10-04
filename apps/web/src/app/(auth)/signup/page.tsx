import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";
import { getMe } from "@/lib/server-api";

export const metadata: Metadata = { title: "Create your profile" };

export default async function SignupPage() {
  if (await getMe()) redirect("/inbox");
  return (
    <AuthCard title="Get your link" subtitle="Create a profile and start receiving anonymous messages." footer={<>Already have an account? <Link href="/login" className="font-semibold text-fg underline underline-offset-4">Log in</Link></>}>
      <SignupForm />
    </AuthCard>
  );
}
