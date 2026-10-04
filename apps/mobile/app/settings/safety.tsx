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
import { timeAgo } from "@/lib/format";
import { useRequest } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { Skeleton } from "@/components/Skeleton";

export default function Safety() {
  const toast = useToast();
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
    if (w.length < 2) { setError("Hidden words need at least 2 characters"); return; }
    setBusy(true);
    try { const r = await api.settings.addHiddenWord(w); words.setData((d) => [...(d ?? []), r]); setWord(""); setError(null); } catch (e) { fail(e); }
    setBusy(false);
  };
  const removeWord = async (id: string) => { try { await api.settings.removeHiddenWord(id); words.setData((d) => (d ?? []).filter((w) => w.id !== id)); } catch (e) { fail(e); } };
  const unblock = async (id: string) => { try { await api.blocks.remove(id); blocks.setData((d) => (d ?? []).filter((b) => b.id !== id)); toast.show("Unblocked", "success"); } catch (e) { fail(e); } };

  return (
    <Screen>
      <SubHeader title="Safety & privacy" />
      {error ? <ErrorBanner message={error} /> : null}
      <Card>
        <SwitchRow label="Accepting messages" description="Turn off to stop all new anonymous messages." value={me.settings.acceptingMessages} onChange={(v) => setting({ acceptingMessages: v })} />
        <SwitchRow label="Enhanced moderation" description="A stricter filter. More borderline messages go to Filtered." value={me.settings.enhancedModeration} onChange={(v) => setting({ enhancedModeration: v })} />
        <SwitchRow label="Show answers publicly" description="Public answers appear on your profile page." value={me.settings.showAnswersPublicly} onChange={(v) => setting({ showAnswersPublicly: v })} />
        {primary ? <SwitchRow label="Pause my link" description="Visitors see a paused page and can't send anything." value={primary.paused} onChange={togglePause} /> : links.loading ? <Skeleton height={40} /> : null}
      </Card>

      <Text variant="heading">Hidden words</Text>
      <Text variant="caption" tone="muted">Messages containing these words go straight to Filtered. Up to {LIMITS.hiddenWordsPerUser}.</Text>
      <Input label="Add a word" value={word} onChangeText={setWord} maxLength={LIMITS.hiddenWordMax} autoCapitalize="none" autoCorrect={false} returnKeyType="done" onSubmitEditing={addWord} />
      <Button title="Hide word" small variant="secondary" onPress={addWord} loading={busy} disabled={word.trim().length < 2} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(words.data ?? []).map((w) => (
          <View key={w.id} style={{ flexDirection: "row", alignItems: "center", paddingLeft: 14, borderRadius: 999, borderWidth: 1, borderColor: "rgba(140,140,170,0.4)" }}>
            <Text variant="bodyStrong" style={{ fontSize: 14 }}>{w.word}</Text>
            <IconButton icon="close" label={`Remove ${w.word}`} size={16} onPress={() => removeWord(w.id)} />
          </View>
        ))}
      </View>

      <Text variant="heading">Blocked sources</Text>
      <Text variant="caption" tone="muted">EAR blocks an anonymous source (a network), not a person. Someone on a new network could still write to you.</Text>
      {blocks.loading ? <Skeleton height={48} /> : (blocks.data ?? []).length === 0 ? <Text tone="muted">No blocked sources.</Text> : (blocks.data ?? []).map((b) => (
        <Card key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{b.label}</Text>
            <Text variant="caption" tone="muted">Blocked {timeAgo(b.createdAt)}</Text>
          </View>
          <Button title="Unblock" small variant="secondary" onPress={() => unblock(b.id)} />
        </Card>
      ))}
    </Screen>
  );
}
