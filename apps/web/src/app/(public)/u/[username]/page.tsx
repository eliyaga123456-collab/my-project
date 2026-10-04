import type { Metadata } from "next";
import { ProfileView } from "@/components/public/ProfileView";
import { getAnswers, getProfile } from "@/lib/public-data";
import { getT } from "@/i18n/server";
import { isolateIn } from "@/i18n/format";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const p = await getProfile(username);
  const { t, locale } = await getT();
  const name = isolateIn(locale, p.displayName);
  const title = t("public.meta.sendTitle", { name });
  const description = p.prompt || p.bio || t("public.meta.userDescription", { name });
  return {
    title,
    description,
    alternates: { canonical: `/u/${p.username}` },
    openGraph: { type: "profile", title, description, url: `/u/${p.username}` },
    twitter: { card: "summary_large_image", title, description }
  };
}

export default async function UserPage({ params }: Props) {
  const { username } = await params;
  const profile = await getProfile(username);
  const answers = await getAnswers(profile.username);
  return <ProfileView profile={profile} target={{ username: profile.username }} answers={answers.items} nextCursor={answers.nextCursor} />;
}
