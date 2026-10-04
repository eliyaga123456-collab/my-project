import type { Metadata } from "next";
import { ProfileView } from "@/components/public/ProfileView";
import { getAnswers, getLinkProfile } from "@/lib/public-data";
import { getT } from "@/i18n/server";
import { isolateIn } from "@/i18n/format";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getLinkProfile(slug);
  const { t, locale } = await getT();
  const name = isolateIn(locale, p.displayName);
  const title = t("public.meta.sendTitle", { name });
  const description = p.prompt || p.bio || t("public.meta.roundDescription", { name });
  return { title, description, robots: { index: false }, openGraph: { type: "profile", title, description }, twitter: { card: "summary_large_image", title, description } };
}

export default async function LinkPage({ params }: Props) {
  const { slug } = await params;
  const profile = await getLinkProfile(slug);
  const answers = await getAnswers(profile.username);
  return <ProfileView profile={profile} target={{ slug }} answers={answers.items} nextCursor={answers.nextCursor} />;
}
