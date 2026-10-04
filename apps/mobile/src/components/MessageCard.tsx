import { memo, useRef } from "react";
import { View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useTheme } from "@/theme";
import { InkIn } from "@/theme/motion";
import type { MessageDto } from "@unsaid/shared";
import { timeAgo } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { Badge } from "./Badge";
import { Card } from "./Card";
import { Icon } from "./Icon";
import { PressableScale } from "./Pressable";
import { Text } from "./Text";

interface Props {
  message: MessageDto;
  index?: number;
  onPress: (m: MessageDto) => void;
  onLongPress: (m: MessageDto) => void;
  onReply: (m: MessageDto) => void;
  onDelete: (m: MessageDto) => void;
}

function MessageCardBase({ message: m, index = 0, onPress, onLongPress, onReply, onDelete }: Props) {
  const { colors } = useTheme();
  const swipe = useRef<Swipeable>(null);
  const action = (label: string, icon: "reply" | "trash", color: string, fn: () => void) => (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => { swipe.current?.close(); fn(); }}
      style={{ width: 76, marginLeft: 8, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: color }}
    >
      <Icon name={icon} size={22} color="#fff" />
      <Text variant="caption" style={{ color: "#fff" }}>{label}</Text>
    </PressableScale>
  );
  const replied = !!m.reply;
  const summary = `${m.read ? "" : "Unread. "}Anonymous message: ${m.body}. ${timeAgo(m.createdAt)}.${replied ? " You replied." : ""}`;
  return (
    <InkIn delay={Math.min(index, 6) * 30}>
      <Swipeable
        ref={swipe}
        overshootRight={false}
        renderRightActions={() => (
          <View style={{ flexDirection: "row", paddingLeft: 4 }}>
            {action("Reply", "reply", colors.secondary, () => onReply(m))}
            {action("Delete", "trash", colors.danger, () => onDelete(m))}
          </View>
        )}
        onSwipeableOpen={() => haptic.select()}
      >
        <PressableScale
          depth={1}
          accessibilityRole="button"
          accessibilityLabel={summary}
          accessibilityHint="Opens actions. Swipe left for reply and delete."
          onPress={() => onPress(m)}
          onLongPress={() => { haptic.press(); onLongPress(m); }}
        >
          <Card glow={!m.read} style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text variant="label" tone={m.read ? "muted" : "primary"}>{m.read ? "Anonymous" : "New · Anonymous"}</Text>
              <View style={{ flex: 1 }} />
              <Text variant="caption" tone="muted">{timeAgo(m.createdAt)}</Text>
            </View>
            <Text variant="body" style={{ fontSize: 17, lineHeight: 25 }}>{m.body}</Text>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {m.linkLabel ? <Badge label={m.linkLabel} /> : null}
              {m.filteredCategories.length > 0 ? <Badge label={`Held: ${m.filteredCategories[0]!.replace("_", " ")}`} tone="warning" /> : null}
              {replied ? <Badge label={m.reply!.public ? "Answered publicly" : "Replied privately"} tone="success" /> : null}
            </View>
          </Card>
        </PressableScale>
      </Swipeable>
    </InkIn>
  );
}

export const MessageCard = memo(MessageCardBase);
