import { useCallback, useRef, useState } from "react";
import { Share, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { LIMITS, REPORT_REASONS, type MessageDto, type ReportReason } from "@unsaid/shared";
import { api } from "@/lib/api";
import { WEB_URL } from "@/lib/env";
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

type Panel = "actions" | "reply" | "share" | "report" | "delete" | "block" | null;

interface Options {
  /** Called with the server's updated message after reply / archive / read changes. */
  onUpdated: (m: MessageDto) => void;
  /** Called when the message is gone from the current list (deleted, blocked -> archived). */
  onRemoved: (id: string) => void;
}

const REASON_LABEL: Record<ReportReason, string> = {
  harassment: "Harassment or bullying", threat: "Threat", hate: "Hate", sexual: "Sexual content", self_harm: "Self-harm", personal_info: "Personal information", spam: "Spam", other: "Something else"
};

export function useMessageActions({ onUpdated, onRemoved }: Options) {
  const { colors, radii } = useTheme();
  const toast = useToast();
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
    if (isPublic && me && !me.user.emailVerified) { toast.show("Verify your email to publish answers. You can still reply privately.", "info"); return; }
    const u = await api.messages.reply(msg.id, replyText.trim(), isPublic);
    onUpdated(u); setMsg(u);
    haptic.success(); toast.show(isPublic ? "Answer published" : "Reply saved", "success");
    setPanel(u.reply?.public ? "share" : null);
  });

  const archive = () => run(async () => {
    if (!msg) return;
    const to = msg.status === "archived" ? "inbox" : "archived";
    const u = await api.messages.update(msg.id, { status: to });
    onRemoved(u.id); close(); toast.show(to === "archived" ? "Archived" : "Moved to inbox", "success");
  });
  const remove = () => run(async () => {
    if (!msg) return;
    await api.messages.remove(msg.id);
    onRemoved(msg.id); close(); toast.show("Message deleted", "success");
  });
  const block = () => run(async () => {
    if (!msg) return;
    await api.messages.block(msg.id);
    onRemoved(msg.id); close(); toast.show("Source blocked. They can't reach you from this network.", "success");
  });
  const sendReport = () => run(async () => {
    if (!msg) return;
    await api.messages.report(msg.id, reason);
    close(); toast.show("Report sent. Thank you.", "success");
  });

  const answerUrl = msg?.reply?.answerId ? `${WEB_URL}/a/${msg.reply.answerId}` : null;
  const shareImage = () => run(async () => {
    if (!cardRef.current) return;
    const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "tmpfile", width: SHARE_CARD_SIZE.width * 3, height: SHARE_CARD_SIZE.height * 3 });
    if (!(await Sharing.isAvailableAsync())) { toast.show("Sharing isn't available on this device.", "error"); return; }
    await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your answer", UTI: "public.png" });
  });
  const shareLink = () => run(async () => { if (answerUrl) await Share.share({ message: answerUrl, url: answerUrl }); });
  const copyLink = () => run(async () => { if (answerUrl) { await Clipboard.setStringAsync(answerUrl); haptic.success(); toast.show("Link copied", "success"); } });

  const row = (icon: IconName, label: string, onPress: () => void, danger = false) => (
    <PressableScale key={label} accessibilityRole="button" accessibilityLabel={label} onPress={() => { haptic.tap(); onPress(); }} depth={1}
      style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 52, paddingHorizontal: 14, borderRadius: radii.md, backgroundColor: colors.surfaceRaised }}>
      <Icon name={icon} size={22} tone={danger ? "danger" : "text"} />
      <Text variant="bodyStrong" tone={danger ? "danger" : "text"}>{label}</Text>
    </PressableScale>
  );

  const element = (
    <>
      <BottomSheet visible={panel === "actions"} onClose={close} title="Message">
        {msg ? <Text tone="muted" numberOfLines={3}>{msg.body}</Text> : null}
        {row("reply", msg?.reply ? "Edit reply" : "Reply", () => setPanel("reply"))}
        {msg?.reply ? row("share", "Share answer", () => setPanel("share")) : null}
        {row("inbox", msg?.status === "archived" ? "Move to inbox" : "Archive", archive)}
        {row("flag", "Report", () => setPanel("report"))}
        {row("block", "Block sender", () => setPanel("block"), true)}
        {row("trash", "Delete", () => setPanel("delete"), true)}
      </BottomSheet>

      <BottomSheet visible={panel === "reply"} onClose={close} title="Reply">
        {msg ? <Text tone="muted" numberOfLines={3}>"{msg.body}"</Text> : null}
        <Textarea label="Your reply" value={replyText} onChangeText={setReplyText} max={LIMITS.replyMax} placeholder="Say something back…" />
        <PressableScale accessibilityRole="switch" accessibilityLabel="Publish as a public answer" accessibilityState={{ checked: isPublic }} depth={0}
          onPress={() => { haptic.select(); setIsPublic((v) => !v); }}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingHorizontal: 14, borderRadius: radii.md, backgroundColor: colors.surfaceRaised }}>
          <Icon name={isPublic ? "eye" : "lock"} size={22} tone="secondary" />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{isPublic ? "Public answer" : "Private reply"}</Text>
            <Text variant="caption" tone="muted">{isPublic ? "Shown on your profile with a share link." : "Only saved to this message."}</Text>
          </View>
          <View style={{ width: 46, height: 28, borderRadius: 14, padding: 3, backgroundColor: isPublic ? colors.primary : colors.border, alignItems: isPublic ? "flex-end" : "flex-start" }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" }} />
          </View>
        </PressableScale>
        <Button title={isPublic ? "Publish answer" : "Save reply"} onPress={sendReply} loading={busy} disabled={replyText.trim().length === 0 || replyText.length > LIMITS.replyMax} />
      </BottomSheet>

      <BottomSheet visible={panel === "share"} onClose={close} title="Share your answer">
        {msg?.reply ? (
          <View style={{ alignItems: "center", paddingVertical: 4 }}>
            <ShareCard ref={cardRef} question={msg.body} answer={msg.reply.text} handle={me?.profile.username ?? ""} />
          </View>
        ) : null}
        <Button title="Share image" onPress={shareImage} loading={busy} icon={<Icon name="share" size={20} color="#fff" />} />
        {answerUrl ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button title="Share link" variant="secondary" small onPress={shareLink} style={{ flex: 1 }} />
            <Button title="Copy link" variant="secondary" small onPress={copyLink} style={{ flex: 1 }} />
          </View>
        ) : (
          <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>This reply is private, so there's no public link — only the image.</Text>
        )}
      </BottomSheet>

      <BottomSheet visible={panel === "report"} onClose={close} title="Report message">
        <Text tone="muted">Tell us what's wrong. Reports are reviewed by our team; the sender is never told.</Text>
        {REPORT_REASONS.map((r) => (
          <PressableScale key={r} depth={0} accessibilityRole="radio" accessibilityLabel={REASON_LABEL[r]} accessibilityState={{ selected: reason === r }} onPress={() => { haptic.select(); setReason(r); }}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingHorizontal: 14, borderRadius: radii.md, borderWidth: 1.5, borderColor: reason === r ? colors.primary : colors.border }}>
            <Text style={{ flex: 1 }}>{REASON_LABEL[r]}</Text>
            {reason === r ? <Icon name="check" size={18} tone="primary" /> : null}
          </PressableScale>
        ))}
        <Button title="Send report" onPress={sendReport} loading={busy} />
      </BottomSheet>

      <ConfirmSheet visible={panel === "delete"} title="Delete this message?" message="It's removed from your inbox for good. This can't be undone." confirmLabel="Delete" destructive loading={busy} onConfirm={remove} onCancel={close} />
      <ConfirmSheet visible={panel === "block"} title="Block this sender?" message="EAR blocks the anonymous source, not a person — it can't identify anyone, and someone on a different network could still write to you. The message is archived." confirmLabel="Block" destructive loading={busy} onConfirm={block} onCancel={close} />
    </>
  );

  return { open, element, askDelete: (m: MessageDto) => { setMsg(m); setPanel("delete"); } };
}
