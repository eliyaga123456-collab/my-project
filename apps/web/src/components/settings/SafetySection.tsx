"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { LIMITS, type SettingsDto, type UpdateSettingsInput } from "@unsaid/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { Button, InputField, Skeleton, Switch, useToast } from "@/components/ui";
import { useMe } from "@/components/app/MeProvider";
import { SettingsCard } from "./parts";

export function useSettingsUpdate() {
  const { me, setMe } = useMe();
  const toast = useToast();
  return async (patch: UpdateSettingsInput, optimistic: SettingsDto) => {
    const prev = me;
    setMe({ ...me, settings: optimistic });
    try {
      const settings = await api.settings.update(patch);
      setMe({ ...me, settings });
    } catch (e) { setMe(prev); toast.error(errorMessage(e)); }
  };
}

export function SafetySection() {
  const { me } = useMe();
  const s = me.settings;
  const update = useSettingsUpdate();
  const toast = useToast();
  const [words, setWords] = useState<{ id: string; word: string }[] | null>(null);
  const [wordsError, setWordsError] = useState<string | null>(null);
  const [word, setWord] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => { api.settings.hiddenWords().then((r) => setWords(r.items), (e) => setWordsError(errorMessage(e))); }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    const w = word.trim().toLowerCase();
    if (w.length < 2) { setAddError("Use at least 2 characters"); return; }
    setAddError(null);
    setAdding(true);
    try {
      const created = await api.settings.addHiddenWord(w);
      setWords((l) => [...(l ?? []), created]);
      setWord("");
    } catch (err) { setAddError(errorMessage(err)); } finally { setAdding(false); }
  }
  async function remove(id: string) {
    const prev = words;
    setWords((l) => l?.filter((x) => x.id !== id) ?? l);
    try { await api.settings.removeHiddenWord(id); } catch (e) { setWords(prev); toast.error(errorMessage(e)); }
  }

  return (
    <SettingsCard id="s-safety" title="Safety & privacy" description="You decide what reaches your inbox.">
      <div className="divide-y divide-line">
        <Switch checked={s.acceptingMessages} onChange={(v) => update({ acceptingMessages: v }, { ...s, acceptingMessages: v })} label="Accepting messages" description="Pause to stop receiving anything. Visitors see a friendly paused notice." />
        <Switch checked={s.enhancedModeration} onChange={(v) => update({ enhancedModeration: v }, { ...s, enhancedModeration: v })} label="Enhanced moderation" description="Stricter filtering. More borderline messages go to Filtered." />
        <Switch checked={s.showAnswersPublicly} onChange={(v) => update({ showAnswersPublicly: v }, { ...s, showAnswersPublicly: v })} label="Show answers on my profile" description="Public replies appear below your message box." />
      </div>

      <h3 className="mt-6 text-lg font-bold">Hidden words</h3>
      <p className="text-sm text-muted">Messages containing these words or phrases never reach your inbox. Up to {LIMITS.hiddenWordsPerUser}.</p>
      <form onSubmit={add} noValidate className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
        <InputField className="flex-1" label="Add a hidden word" hideLabel placeholder="Add a word or phrase" value={word} onChange={(e) => setWord(e.target.value)} maxLength={LIMITS.hiddenWordMax} error={addError} />
        <Button type="submit" variant="secondary" loading={adding} className="h-12">Add</Button>
      </form>
      <div className="mt-3">
        {wordsError && <p role="alert" className="text-sm text-danger">{wordsError}</p>}
        {!words && !wordsError && <Skeleton className="h-8 w-48" />}
        {words && words.length === 0 && <p className="text-sm text-muted">No hidden words yet.</p>}
        {words && words.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Hidden words">
            {words.map((w) => (
              <li key={w.id} className="inline-flex items-center gap-1 rounded-full bg-raised py-1 pl-3.5 pr-1 text-sm">
                <span className="[overflow-wrap:anywhere]">{w.word}</span>
                <button type="button" aria-label={`Remove ${w.word}`} onClick={() => remove(w.id)} className="grid size-7 place-items-center rounded-full text-muted hover:bg-line hover:text-fg"><X className="size-4" aria-hidden /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SettingsCard>
  );
}
