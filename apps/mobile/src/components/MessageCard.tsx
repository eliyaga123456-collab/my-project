import { memo, useRef } from "react";
import { View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useTheme } from "@/theme";
import { InkIn } from "@/theme/motion";
import type { MessageDto } from "@unsaid/shared";
import { useT, type Key } from "@/i18n";
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
  const { t, formatRelative, isRTL } = useT();
  const swipe = useRef<Swipeable>(null);
  const action = (label: string, icon: "reply" | "trash", color: string, fn: () => void) => (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => { swipe.current?.close(); fn(); }}
      style={{ width: 76, marginStart: 8, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: color }}
    >
      <Icon name={icon} size={22} color="#fff" />
      <Text variant="caption" style={{ color: "#fff" }}>{label}</Text>
    </PressableScale>
  );
  const replied = !!m.reply;
  const summary = t("messageCard.summary", { unread: m.read ? "" : t("messageCard.unreadPrefix"), body: m.body, time: formatRelative(m.createdAt), replied: replied ? t("messageCard.youReplied") : "" });
  const category = m.filteredCategories[0];
  // Actions sit at the trailing edge and are revealed by swiping toward the leading edge: swipe left (right actions) in LTR, swipe right (left actions) in RTL.
  const actions = () => (
    <View style={{ flexDirection: "row", paddingStart: 4 }}>
      {action(t("messageCard.reply"), "reply", colors.secondary, () => onReply(m))}
      {action(t("messageCard.delete"), "trash", colors.danger, () => onDelete(m))}
    </View>
  );
  return (
    <InkIn delay={Math.min(index, 6) * 30}>
      <Swipeable
        ref={swipe}
        overshootRight={false}
        overshootLeft={false}
        {...(isRTL ? { renderLeftActions: actions } : { renderRightActions: actions })}
        onSwipeableOpen={() => haptic.select()}
      >
        <PressableScale
          depth={1}
          pressScale={0.985}
          accessibilityRole="button"
          accessibilityLabel={summary}
          accessibilityHint={t("messageCard.hint")}
          onPress={() => onPress(m)}
          onLongPress={() => { haptic.press(); onLongPress(m); }}
        >
          <Card glow={!m.read} style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text variant="label" tone={m.read ? "muted" : "primary"}>{m.read ? t("messageCard.anonymous") : t("messageCard.newAnonymous")}</Text>
              <View style={{ flex: 1 }} />
              <Text variant="caption" tone="muted">{formatRelative(m.createdAt)}</Text>
            </View>
            <Text variant="body" style={{ fontSize: 17, lineHeight: 25 }}>{m.body}</Text>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {m.linkLabel ? <Badge label={m.linkLabel} /> : null}
              {category ? <Badge label={t("messageCard.held", { category: t(`category.${category}` as Key) })} tone="warning" /> : null}
              {replied ? <Badge label={m.reply!.public ? t("messageCard.answeredPublicly") : t("messageCard.repliedPrivately")} tone="success" /> : null}
            </View>
          </Card>
        </PressableScale>
      </Swipeable>
    </InkIn>
  );
}

export const MessageCard = memo(MessageCardBase);
