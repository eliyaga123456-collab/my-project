import type { Metadata } from "next";
import { ProfileView } from "@/components/public/ProfileView";
import { getAnswers, getProfile } from "@/lib/public-data";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const p = await getProfile(username);
  const title = `Send ${p.displayName} an anonymous message`;
  const description = p.prompt || p.bio || `Say what you've been meaning to say to ${p.displayName}. Anonymous, kind and safe.`;
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
