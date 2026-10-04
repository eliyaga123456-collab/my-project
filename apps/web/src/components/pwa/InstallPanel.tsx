"use client";

import { useEffect, useState } from "react";
import { Apple, Check, Download, MonitorSmartphone, PlusSquare, Share, Smartphone } from "lucide-react";
import { ButtonLink, cx } from "@/components/ui";
import { ShareActions } from "@/components/public/ShareActions";
import { useT } from "@/i18n/client";
import { rich } from "@/lib/rich";
import { ANDROID_APP_URL, APK_URL, INSTALL_PATH, IOS_APP_URL } from "@/lib/site";
import { usePwaInstall } from "./usePwaInstall";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-raised text-sm font-bold text-primary" aria-hidden>{n}</span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

export function InstallPanel({ qrDataUri, apkUrl = APK_URL }: { qrDataUri: string; apkUrl?: string }) {
  const { t } = useT();
  const { ready, platform: detected, installed } = usePwaInstall();
  const platform = ready ? detected : null;
  const [url, setUrl] = useState(INSTALL_PATH);
  useEffect(() => { setUrl(new URL(INSTALL_PATH, window.location.origin).toString()); }, []);

  const androidHref = ANDROID_APP_URL || apkUrl;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="install-android" className={cx("veil p-5 sm:p-7", platform === "android" && "ring-2 ring-primary max-md:order-first")}>
          <div className="relative">
            <h2 id="install-android" className="flex flex-wrap items-center gap-2 text-xl font-bold"><Smartphone className="size-5 text-primary" aria-hidden />{t("site.install.installAndroid")}
              {platform === "android" && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">{t("site.install.yourDevice")}</span>}</h2>
            <p className="mt-2 text-muted">{t("site.install.androidLead")}</p>
            <div className="mt-4">
              <ButtonLink href={androidHref} size="lg" className="w-full sm:w-auto" data-testid="android-download">
                <Download className="size-4" aria-hidden />{ANDROID_APP_URL ? t("site.install.googlePlay") : t("site.install.apk")}
              </ButtonLink>
            </div>
            {!ANDROID_APP_URL && (
              <ol className="mt-5 space-y-3">
                <Step n={1}>{rich(t("site.install.step1"))}</Step>
                <Step n={2}>{rich(t("site.install.step2"))}</Step>
              </ol>
            )}
          </div>
        </section>

        <section aria-labelledby="install-ios" className={cx("veil p-5 sm:p-7", platform === "ios" && "ring-2 ring-primary max-md:order-first")} data-testid="ios-pwa">
          <div className="relative">
            <h2 id="install-ios" className="flex flex-wrap items-center gap-2 text-xl font-bold"><Apple className="size-5 text-primary" aria-hidden />{t("site.install.installIos")}
              {platform === "ios" && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">{t("site.install.yourDevice")}</span>}</h2>
            <p className="mt-2 text-muted">{t("site.install.iosLead")}</p>
            {IOS_APP_URL && (
              <div className="mt-4"><ButtonLink href={IOS_APP_URL} size="lg" variant="outline" className="w-full sm:w-auto"><Apple className="size-4" aria-hidden />{t("site.install.appStore")}</ButtonLink></div>
            )}
            {installed && platform === "ios" ? (
              <div role="status" className="mt-4 rounded-lg border border-success/40 bg-success/10 p-4 text-center">
                <Check className="mx-auto size-7 text-success" aria-hidden />
                <p className="mt-2 font-bold">{t("site.install.installedTitle")}</p>
                <ButtonLink href="/inbox" className="mt-3">{t("site.install.openInbox")}</ButtonLink>
              </div>
            ) : (
              <>
                <p className="mt-4 text-muted">{rich(t("site.install.iosIntro"))}</p>
                <ol className="mt-3 space-y-3">
                  <Step n={1}><Share className="me-1.5 inline size-4 align-text-bottom" aria-hidden />{rich(t("site.install.iosStep1"))}</Step>
                  <Step n={2}><PlusSquare className="me-1.5 inline size-4 align-text-bottom" aria-hidden />{rich(t("site.install.iosStep2"))}</Step>
                  <Step n={3}>{rich(t("site.install.iosStep3"))}</Step>
                </ol>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/signup" size="lg" className="w-full sm:w-auto" data-testid="ios-open-web">{t("site.install.iosOpenWeb")}</ButtonLink>
                  <ButtonLink href="/login" size="lg" variant="outline" className="w-full sm:w-auto" data-testid="ios-login">{t("site.install.iosHaveAccount")}</ButtonLink>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
      <p className="text-sm text-muted" data-testid="web-app-note">{t("site.install.webAppNote")}</p>

      <section aria-labelledby="send-link" className="veil p-5 sm:p-7">
        <div className="relative grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUri} alt={t("site.install.qrAlt")} width={176} height={176} className="mx-auto size-44 rounded-xl bg-white p-3" />
          <div>
            <h2 id="send-link" className="flex items-center gap-2 text-xl font-bold"><MonitorSmartphone className="size-5 text-secondary" aria-hidden />{t("site.install.sendTitle")}</h2>
            <p className="mt-1 text-muted">{t("site.install.sendBody")}</p>
            <p className="mt-3 break-all rounded-md bg-raised px-3 py-2 font-mono text-sm" data-testid="install-link" dir="ltr">{url}</p>
            <div className="mt-4"><ShareActions path={INSTALL_PATH} text={t("site.install.shareText")} /></div>
          </div>
        </div>
      </section>
    </div>
  );
}
