import { useT } from "@/i18n";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { Text } from "./Text";

interface Props { visible: boolean; title: string; message: string; confirmLabel: string; destructive?: boolean; loading?: boolean; onConfirm: () => void; onCancel: () => void }

export function ConfirmSheet({ visible, title, message, confirmLabel, destructive, loading, onConfirm, onCancel }: Props) {
  const { t } = useT();
  return (
    <BottomSheet visible={visible} onClose={onCancel} title={title}>
      <Text tone="muted">{message}</Text>
      <Button title={confirmLabel} variant={destructive ? "danger" : "primary"} loading={loading} onPress={onConfirm} />
      <Button title={t("common.cancel")} variant="ghost" onPress={onCancel} />
    </BottomSheet>
  );
}
