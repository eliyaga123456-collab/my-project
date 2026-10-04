import { useCallback, useRef, useState } from "react";
import { Share, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { LIMITS, REPORT_REASONS, type MessageDto, type ReportReason } from "@unsaid/shared";
import { api } from "@/lib/api";
import { WEB_URL } from "@/lib/env";
import { answerUrl as buildAnswerUrl } from "@/lib/share";
import { errorMessage } from "@/lib/errors";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/providers/AuthProvider";
import { useNetwork } from "@/providers/NetworkProvider";
import { Button } from "./Button";
import { BottomSheet } from "./BottomSheet";
import { ConfirmSheet } from "./ConfirmSheet";
import { Icon, type IconName } from "./Icon";
import { PressableScale } from "./Pressable";
import { ShareCard, SHARE_CARD_SIZE } from "./ShareCard";
import { Text } from "./Text";
import { Textarea } from "./Input";
import { useToast } from "./Toast";
import { useTheme } from "@/theme";
import { useT, stripIsolates } from "@/i18n";

type Panel = "actions" | "reply" | "share" | "report" | "delete" | "block" | null;

interface Options {
  /** Called with the server's updated message after reply / archive / read changes. */
  onUpdated: (m: MessageDto) => void;
  /** Called when the message is gone from the current list (deleted, blocked -> archived). */
  onRemoved: (id: string) => void;
}

export function useMessageActions({ onUpdated, onRemoved }: Options) {
  const { colors, radii } = useTheme();
  const toast = useToast();
  const { t } = useT();
  const { report } = useNetwork();
  const { me, refreshMe } = useAuth();
  const [msg, setMsg] = useState<MessageDto | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [reason, setReason] = useState<ReportReason>("harassment");
  const cardRef = useRef<View>(null);

  const open = useCallback((m: MessageDto, to: Panel = "actions") => {
    setMsg(m);
    setReplyText(m.reply?.text ?? "");
    setIsPublic(m.reply?.public ?? true);
    setPanel(to);
    if (!m.read) {
      api.messages.update(m.id, { read: true }).then((u) => { onUpdated(u); void refreshMe().catch(() => undefined); }).catch(report);
    }
  }, [onUpdated, refreshMe, report]);

  const close = () => setPanel(null);
  const fail = (e: unknown) => { toast.show(errorMessage(e), "error"); report(e); };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { fail(e); }
    setBusy(false);
  };

  const sendReply = () => run(async () => {
    if (!msg) return;
    if (isPublic && me && !me.user.emailVerified) { toast.show(t("actions.verifyToPublish"), "info"); return; }
    const u = await api.messages.reply(msg.id, replyText.trim(), isPublic);
    onUpdated(u); setMsg(u);
    haptic.success(); toast.show(isPublic ? t("actions.answerPublished") : t("actions.replySaved"), "success");
    setPanel(u.reply?.public ? "share" : null);
  });

  const archive = () => run(async () => {
    if (!msg) return;
    const to = msg.status === "archived" ? "inbox" : "archived";
    const u = await api.messages.update(msg.id, { status: to });
    onRemoved(u.id); close(); toast.show(to === "archived" ? t("actions.archived") : t("actions.movedToInbox"), "success");
  });
  const remove = () => run(async () => {
    if (!msg) return;
    await api.messages.remove(msg.id);
    onRemoved(msg.id); close(); toast.show(t("actions.deleted"), "success");
  });
  const block = () => run(async () => {
    if (!msg) return;
    await api.messages.block(msg.id);
    onRemoved(msg.id); close(); toast.show(t("actions.blocked"), "success");
  });
  const sendReport = () => run(async () => {
    if (!msg) return;
    await api.messages.report(msg.id, reason);
    close(); toast.show(t("actions.reported"), "success");
  });

  const answerUrl = msg?.reply?.answerId ? buildAnswerUrl(WEB_URL, msg.reply.answerId) : null;
  const shareImage = () => run(async () => {
    if (!cardRef.current) return;
    const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "tmpfile", width: SHARE_CARD_SIZE.width * 3, height: SHARE_CARD_SIZE.height * 3 });
    if (!(await Sharing.isAvailableAsync())) { toast.show(t("actions.sharingUnavailable"), "error"); return; }
    await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: t("actions.shareDialogTitle"), UTI: "public.png" });
  });
  const shareLink = () => run(async () => { if (answerUrl) await Share.share({ message: stripIsolates(answerUrl), url: answerUrl }); });
  const copyLink = () => run(async () => { if (answerUrl) { await Clipboard.setStringAsync(answerUrl); haptic.success(); toast.show(t("actions.linkCopied"), "success"); } });

  const row = (icon: IconName, label: string, onPress: () => void, danger = false) => (
    <PressableScale key={label} accessibilityRole="button" accessibilityLabel={label} onPress={() => { haptic.tap(); onPress(); }} depth={1}
      style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 52, paddingHorizontal: 14, borderRadius: radii.md, backgroundColor: colors.surfaceRaised }}>
      <Icon name={icon} size={22} tone={danger ? "danger" : "text"} />
      <Text variant="bodyStrong" tone={danger ? "danger" : "text"}>{label}</Text>
    </PressableScale>
  );

  const element = (
    <>
      <BottomSheet visible={panel === "actions"} onClose={close} title={t("actions.sheetTitle")}>
        {msg ? <Text tone="muted" numberOfLines={3}>{msg.body}</Text> : null}
        {row("reply", msg?.reply ? t("actions.editReply") : t("actions.reply"), () => setPanel("reply"))}
        {msg?.reply ? row("share", t("actions.shareAnswer"), () => setPanel("share")) : null}
        {row("inbox", msg?.status === "archived" ? t("actions.moveToInbox") : t("actions.archive"), archive)}
        {row("flag", t("actions.report"), () => setPanel("report"))}
        {row("block", t("actions.blockSender"), () => setPanel("block"), true)}
        {row("trash", t("actions.delete"), () => setPanel("delete"), true)}
      </BottomSheet>

      <BottomSheet visible={panel === "reply"} onClose={close} title={t("actions.replyTitle")}>
        {msg ? <Text tone="muted" numberOfLines={3}>{"\u201C"}{msg.body}{"\u201D"}</Text> : null}
        <Textarea label={t("actions.yourReply")} value={replyText} onChangeText={setReplyText} max={LIMITS.replyMax} placeholder={t("actions.replyPlaceholder")} />
        <PressableScale accessibilityRole="switch" accessibilityLabel={t("actions.publishToggle")} accessibilityState={{ checked: isPublic }} depth={0}
          onPress={() => { haptic.select(); setIsPublic((v) => !v); }}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingHorizontal: 14, borderRadius: radii.md, backgroundColor: colors.surfaceRaised }}>
          <Icon name={isPublic ? "eye" : "lock"} size={22} tone="secondary" />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{isPublic ? t("actions.publicAnswer") : t("actions.privateReply")}</Text>
            <Text variant="caption" tone="muted">{isPublic ? t("actions.publicHint") : t("actions.privateHint")}</Text>
          </View>
          <View style={{ width: 46, height: 28, borderRadius: 14, padding: 3, backgroundColor: isPublic ? colors.primary : colors.border, alignItems: isPublic ? "flex-end" : "flex-start" }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" }} />
          </View>
        </PressableScale>
        <Button title={isPublic ? t("actions.publishAnswer") : t("actions.saveReply")} onPress={sendReply} loading={busy} disabled={replyText.trim().length === 0 || replyText.length > LIMITS.replyMax} />
      </BottomSheet>

      <BottomSheet visible={panel === "share"} onClose={close} title={t("actions.shareTitle")}>
        {msg?.reply ? (
          <View style={{ alignItems: "center", paddingVertical: 4 }}>
            <ShareCard ref={cardRef} question={msg.body} answer={msg.reply.text} handle={me?.profile.username ?? ""} />
          </View>
        ) : null}
        <Button title={t("actions.shareImage")} onPress={shareImage} loading={busy} icon={<Icon name="share" size={20} color="#fff" />} />
        {answerUrl ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button title={t("actions.shareLink")} variant="secondary" small onPress={shareLink} style={{ flex: 1 }} />
            <Button title={t("actions.copyLink")} variant="secondary" small onPress={copyLink} style={{ flex: 1 }} />
          </View>
        ) : (
          <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>{t("actions.privateNoLink")}</Text>
        )}
      </BottomSheet>

      <BottomSheet visible={panel === "report"} onClose={close} title={t("actions.reportTitle")}>
        <Text tone="muted">{t("actions.reportIntro")}</Text>
        {REPORT_REASONS.map((r) => (
          <PressableScale key={r} depth={0} accessibilityRole="radio" accessibilityLabel={t(`actions.reasons.${r}`)} accessibilityState={{ selected: reason === r }} onPress={() => { haptic.select(); setReason(r); }}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingHorizontal: 14, borderRadius: radii.md, borderWidth: 1.5, borderColor: reason === r ? colors.primary : colors.border }}>
            <Text style={{ flex: 1 }}>{t(`actions.reasons.${r}`)}</Text>
            {reason === r ? <Icon name="check" size={18} tone="primary" /> : null}
          </PressableScale>
        ))}
        <Button title={t("actions.sendReport")} onPress={sendReport} loading={busy} />
      </BottomSheet>

      <ConfirmSheet visible={panel === "delete"} title={t("actions.deleteTitle")} message={t("actions.deleteBody")} confirmLabel={t("actions.delete")} destructive loading={busy} onConfirm={remove} onCancel={close} />
      <ConfirmSheet visible={panel === "block"} title={t("actions.blockTitle")} message={t("actions.blockBody")} confirmLabel={t("actions.block")} destructive loading={busy} onConfirm={block} onCancel={close} />
    </>
  );

  return { open, element, askDelete: (m: MessageDto) => { setMsg(m); setPanel("delete"); } };
}
