import { useLocalSearchParams } from "expo-router";
import { PublicProfileView } from "@/components/PublicProfileView";

export default function UserPage() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return <PublicProfileView target={{ kind: "u", username: String(username).toLowerCase() }} />;
}
