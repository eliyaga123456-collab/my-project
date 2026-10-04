import { View } from "react-native";
import { useTheme } from "@/theme";

/** Entry route: the guard in _layout redirects to /welcome or /inbox as soon as auth state is known. */
export default function Index() {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
