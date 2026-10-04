"use client";

import { Download, Share2 } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { ShareActions } from "@/components/public/ShareActions";
import { useT } from "@/i18n/client";
import { INSTALL_PATH } from "@/lib/site";
import { SettingsCard } from "./parts";

export function GetAppSection() {
  const { t } = useT();
  return (
    <SettingsCard id="get-app" title={t("app.settings.getApp.title")} description={t("app.settings.getApp.body")}>
      <div className="space-y-4">
        <ButtonLink href={INSTALL_PATH} variant="secondary"><Download className="size-4" aria-hidden />{t("app.settings.getApp.guide")}</ButtonLink>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Share2 className="size-4" aria-hidden />{t("app.settings.getApp.share")}</p>
          <ShareActions path={INSTALL_PATH} text={t("site.install.shareText")} compact />
        </div>
      </div>
    </SettingsCard>
  );
}
