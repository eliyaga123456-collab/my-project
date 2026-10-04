import { View } from "react-native";
import { useRouter } from "expo-router";
import { IconButton } from "./IconButton";
import { Text } from "./Text";

export function SubHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginLeft: -8 }}>
      <IconButton icon="chevron" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/me"))} style={{ transform: [{ scaleX: -1 }] }} />
      <Text variant="title">{title}</Text>
    </View>
  );
}
