import { useLocalSearchParams } from "expo-router";
import { PublicProfileView } from "@/components/PublicProfileView";

export default function LinkPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <PublicProfileView target={{ kind: "l", slug: String(slug) }} />;
}
