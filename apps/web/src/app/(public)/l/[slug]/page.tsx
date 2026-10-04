import type { Metadata } from "next";
import { ProfileView } from "@/components/public/ProfileView";
import { getAnswers, getLinkProfile } from "@/lib/public-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getLinkProfile(slug);
  const title = `Send ${p.displayName} an anonymous message`;
  const description = p.prompt || p.bio || `Say what you've been meaning to say to ${p.displayName}.`;
  return { title, description, robots: { index: false }, openGraph: { type: "profile", title, description }, twitter: { card: "summary_large_image", title, description } };
}

export default async function LinkPage({ params }: Props) {
  const { slug } = await params;
  const profile = await getLinkProfile(slug);
  const answers = await getAnswers(profile.username);
  return <ProfileView profile={profile} target={{ slug }} answers={answers.items} nextCursor={answers.nextCursor} />;
}
