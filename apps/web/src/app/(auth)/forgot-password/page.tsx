import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotForm } from "@/components/auth/ForgotForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a link to choose a new one." footer={<Link href="/login" className="font-semibold text-fg underline underline-offset-4">Back to log in</Link>}>
      <ForgotForm />
    </AuthCard>
  );
}
