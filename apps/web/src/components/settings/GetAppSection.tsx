"use client";

import { Download, Share2 } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { ShareActions } from "@/components/public/ShareActions";
import { INSTALL_PATH } from "@/lib/site";
import { SettingsCard } from "./parts";

export function GetAppSection() {
  return (
    <SettingsCard id="get-app" title="Get the app" description="Install EAR on your phone, or send the install link to a friend.">
      <div className="space-y-4">
        <ButtonLink href={INSTALL_PATH} variant="secondary"><Download className="size-4" aria-hidden />Open install guide</ButtonLink>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Share2 className="size-4" aria-hidden />Share the install link</p>
          <ShareActions path={INSTALL_PATH} text="Get EAR — anonymous questions & replies" compact />
        </div>
      </div>
    </SettingsCard>
  );
}
