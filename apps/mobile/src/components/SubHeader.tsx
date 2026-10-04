import { View } from "react-native";
import { useRouter } from "expo-router";
import { useT } from "@/i18n";
import { IconButton } from "./IconButton";
import { Text } from "./Text";

export function SubHeader({ title }: { title: string }) {
  const router = useRouter();
  const { t } = useT();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginStart: -8 }}>
      <IconButton icon="chevron" dir="back" label={t("common.back")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/me"))} />
      <Text variant="title" style={{ flex: 1 }}>{title}</Text>
    </View>
  );
}
