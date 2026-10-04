import { useState } from "react";
import { View } from "react-native";
import { LIMITS } from "@unsaid/shared";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorState";
import { IconButton } from "@/components/IconButton";
import { Input } from "@/components/Input";
import { SwitchRow } from "@/components/SettingRow";
import { Screen } from "@/components/Screen";
import { SubHeader } from "@/components/SubHeader";
import { Text } from "@/components/Text";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useT } from "@/i18n";
import { useRequest } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { Skeleton } from "@/components/Skeleton";

export default function Safety() {
  const toast = useToast();
  const { t, formatRelative } = useT();
  const { me, patchMe } = useAuth();
  const words = useRequest(() => api.settings.hiddenWords().then((r) => r.items));
  const blocks = useRequest(() => api.blocks.list().then((r) => r.items));
  const links = useRequest(() => api.links.list().then((r) => r.items));
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!me) return null;

  const fail = (e: unknown) => { setError(errorMessage(e)); toast.show(errorMessage(e), "error"); };
  const setting = async (patch: Parameters<typeof api.settings.update>[0]) => {
    try { const s = await api.settings.update(patch); patchMe((m) => ({ ...m, settings: s })); setError(null); } catch (e) { fail(e); }
  };
  const primary = links.data?.find((l) => l.isPrimary);
  const togglePause = async (paused: boolean) => {
    try { const l = await api.links.pause(paused); links.setData((d) => (d ?? []).map((x) => (x.id === l.id ? l : x))); setError(null); } catch (e) { fail(e); }
  };
  const addWord = async () => {
    const w = word.trim().toLowerCase();
    if (w.length < 2) { setError(t("settings.safety.wordTooShort")); return; }
    setBusy(true);
    try { const r = await api.settings.addHiddenWord(w); words.setData((d) => [...(d ?? []), r]); setWord(""); setError(null); } catch (e) { fail(e); }
    setBusy(false);
  };
  const removeWord = async (id: string) => { try { await api.settings.removeHiddenWord(id); words.setData((d) => (d ?? []).filter((w) => w.id !== id)); } catch (e) { fail(e); } };
  const unblock = async (id: string) => { try { await api.blocks.remove(id); blocks.setData((d) => (d ?? []).filter((b) => b.id !== id)); toast.show(t("settings.safety.unblocked"), "success"); } catch (e) { fail(e); } };

  return (
    <Screen>
      <SubHeader title={t("settings.safety.title")} />
      {error ? <ErrorBanner message={error} /> : null}
      <Card>
        <SwitchRow label={t("settings.safety.accepting")} description={t("settings.safety.acceptingDesc")} value={me.settings.acceptingMessages} onChange={(v) => setting({ acceptingMessages: v })} />
        <SwitchRow label={t("settings.safety.enhanced")} description={t("settings.safety.enhancedDesc")} value={me.settings.enhancedModeration} onChange={(v) => setting({ enhancedModeration: v })} />
        <SwitchRow label={t("settings.safety.showPublic")} description={t("settings.safety.showPublicDesc")} value={me.settings.showAnswersPublicly} onChange={(v) => setting({ showAnswersPublicly: v })} />
        {primary ? <SwitchRow label={t("settings.safety.pause")} description={t("settings.safety.pauseDesc")} value={primary.paused} onChange={togglePause} /> : links.loading ? <Skeleton height={40} /> : null}
      </Card>

      <Text variant="heading">{t("settings.safety.hiddenWords")}</Text>
      <Text variant="caption" tone="muted">{t("settings.safety.hiddenWordsDesc", { max: LIMITS.hiddenWordsPerUser })}</Text>
      <Input label={t("settings.safety.addWord")} value={word} onChangeText={setWord} maxLength={LIMITS.hiddenWordMax} autoCapitalize="none" autoCorrect={false} returnKeyType="done" onSubmitEditing={addWord} />
      <Button title={t("settings.safety.hideWord")} small variant="secondary" onPress={addWord} loading={busy} disabled={word.trim().length < 2} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(words.data ?? []).map((w) => (
          <View key={w.id} style={{ flexDirection: "row", alignItems: "center", paddingStart: 14, borderRadius: 999, borderWidth: 1, borderColor: "rgba(140,140,170,0.4)" }}>
            <Text variant="bodyStrong" style={{ fontSize: 14 }}>{w.word}</Text>
            <IconButton icon="close" label={t("settings.safety.removeWord", { word: w.word })} size={16} onPress={() => removeWord(w.id)} />
          </View>
        ))}
      </View>

      <Text variant="heading">{t("settings.safety.blocked")}</Text>
      <Text variant="caption" tone="muted">{t("settings.safety.blockedDesc")}</Text>
      {blocks.loading ? <Skeleton height={48} /> : (blocks.data ?? []).length === 0 ? <Text tone="muted">{t("settings.safety.noBlocked")}</Text> : (blocks.data ?? []).map((b) => (
        <Card key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{b.label}</Text>
            <Text variant="caption" tone="muted">{t("settings.safety.blockedAgo", { time: formatRelative(b.createdAt) })}</Text>
          </View>
          <Button title={t("settings.safety.unblock")} small variant="secondary" onPress={() => unblock(b.id)} />
        </Card>
      ))}
    </Screen>
  );
}
