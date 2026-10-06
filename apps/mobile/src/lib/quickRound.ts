import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { LIMITS } from "@unsaid/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { haptic } from "@/lib/haptics";
import { useT } from "@/i18n";
import { useToast } from "@/components/Toast";
import { useNetwork } from "@/providers/NetworkProvider";

/** One tap = a new round with an automatic name, then straight to its screen (link, copy, share). Details can be edited there. */
export function useQuickRound() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useT();
  const { report } = useNetwork();
  const [busy, setBusy] = useState(false);
  const create = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { items } = await api.links.list();
      const n = items.filter((l) => !l.isPrimary).length + 1;
      const link = await api.links.create({ label: t("share.autoRoundName", { n: String(n) }).slice(0, LIMITS.linkLabelMax) });
      haptic.success();
      router.push({ pathname: "/round/[id]", params: { id: link.id, fresh: "1" } });
    } catch (e) {
      toast.show(errorMessage(e), "error");
      report(e);
    } finally {
      setBusy(false);
    }
  }, [busy, router, t, toast, report]);
  return { create, busy };
}
