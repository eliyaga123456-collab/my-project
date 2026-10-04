import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { Button } from "./Button";
import { Card } from "./Card";
import { Text } from "./Text";
import { useT } from "@/i18n";
import { checkForUpdate, downloadAndInstall, installedBuild, updaterEnabled, type UpdateInfo } from "@/lib/update";
import { useToast } from "./Toast";

/** Shows "Update available" on the Me tab for the sideloaded Android build. Renders nothing when there is no update (or on Play/iOS builds). */
export function UpdateCard({ onlyWhenAvailable = false }: { onlyWhenAvailable?: boolean }) {
  const { t } = useT();
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const toast = useToast();

  const refresh = useCallback(() => { void checkForUpdate().then((u) => setInfo(u)); }, []);
  useEffect(() => {
    if (!updaterEnabled()) return;
    refresh();
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") refresh(); });
    return () => sub.remove();
  }, [refresh]);

  if (!updaterEnabled()) return null;
  if (!info?.available && onlyWhenAvailable) return null;
  if (!info?.available) {
    const check = async () => {
      setChecking(true);
      const u = await checkForUpdate(true);
      setInfo(u);
      setChecking(false);
      if (!u) toast.show(t("me.updateCheckFailed"), "error");
      else if (!u.available) toast.show(t("me.upToDate"), "success");
    };
    return (
      <Card style={{ gap: 8 }}>
        <Text variant="bodyStrong">{t("me.versionLine", { build: String(installedBuild()) })}</Text>
        <Button title={t("me.checkUpdates")} variant="ghost" small onPress={() => void check()} loading={checking} />
      </Card>
    );
  }
  const busy = progress !== null;
  const update = async () => {
    setNote(null); setProgress(0);
    const r = await downloadAndInstall(info.apkUrl, setProgress);
    setProgress(null);
    if (r === "needs-permission") setNote(t("me.updateAllow"));
    else if (r === "browser") setNote(t("me.updateBrowser"));
  };
  return (
    <Card glow style={{ gap: 10 }} accessibilityRole="summary">
      <Text variant="bodyStrong">{t("me.updateTitle")}</Text>
      <Text tone="muted">{t("me.updateBody", { latest: String(info.latest), installed: String(info.installed) })}</Text>
      {busy ? <Text tone="muted">{t("me.updateDownloading", { pct: String(Math.round((progress ?? 0) * 100)) })}</Text> : null}
      {note ? <Text tone="muted">{note}</Text> : null}
      <Button title={t("me.updateNow")} onPress={() => void update()} loading={busy} small />
    </Card>
  );
}
