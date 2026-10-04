"use client";

import { useEffect, useState } from "react";
import { Apple, Download, MonitorSmartphone, Smartphone } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { ShareActions } from "@/components/public/ShareActions";
import { ANDROID_APP_URL, APK_URL, INSTALL_PATH, IOS_APP_URL } from "@/lib/site";

type Platform = "ios" | "android" | "desktop";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-raised text-sm font-bold text-primary" aria-hidden>{n}</span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

export function InstallPanel({ qrDataUri, apkUrl = APK_URL }: { qrDataUri: string; apkUrl?: string }) {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [url, setUrl] = useState(INSTALL_PATH);
  useEffect(() => {
    const ua = navigator.userAgent;
    setPlatform(/iPhone|iPad|iPod/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "desktop");
    setUrl(new URL(INSTALL_PATH, window.location.origin).toString());
  }, []);

  const androidHref = ANDROID_APP_URL || apkUrl;
  return (
    <div className="space-y-6">
      <section aria-labelledby="install-now" className="veil p-5 sm:p-7">
        <div className="relative">
          <h2 id="install-now" className="flex items-center gap-2 text-xl font-bold"><Smartphone className="size-5 text-primary" aria-hidden />
            {platform === "ios" ? "Install on iPhone" : platform === "android" ? "Install on Android" : "Get the app"}</h2>
          <p className="mt-2 text-muted">Accounts, your inbox and your links live only in the app. This website is just for sending anonymous messages.</p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {platform !== "ios" && (
              <ButtonLink href={androidHref} size="lg" className="w-full sm:w-auto" data-testid="android-download">
                <Download className="size-4" aria-hidden />{ANDROID_APP_URL ? "Get it on Google Play" : "Download for Android (APK)"}
              </ButtonLink>
            )}
            {IOS_APP_URL && platform !== "android" && (
              <ButtonLink href={IOS_APP_URL} size="lg" variant="outline" className="w-full sm:w-auto"><Apple className="size-4" aria-hidden />Get it on the App Store</ButtonLink>
            )}
          </div>

          {platform === "android" && !ANDROID_APP_URL && (
            <ol className="mt-5 space-y-3">
              <Step n={1}>Tap <strong>Download for Android</strong> and open the file.</Step>
              <Step n={2}>If asked, allow installs from this browser, then tap <strong>Install</strong>.</Step>
            </ol>
          )}
          {platform === "ios" && !IOS_APP_URL && (
            <p className="mt-4 rounded-md bg-raised px-3 py-2 text-muted">The iPhone app is coming soon. Android is available now.</p>
          )}
        </div>
      </section>

      <section aria-labelledby="send-link" className="veil p-5 sm:p-7">
        <div className="relative grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUri} alt="QR code that opens the EAR install page" width={176} height={176} className="mx-auto size-44 rounded-xl bg-white p-3" />
          <div>
            <h2 id="send-link" className="flex items-center gap-2 text-xl font-bold"><MonitorSmartphone className="size-5 text-secondary" aria-hidden />Send the install link</h2>
            <p className="mt-1 text-muted">Scan with your phone, or share the link in your story, bio or group chat.</p>
            <p className="mt-3 break-all rounded-md bg-raised px-3 py-2 font-mono text-sm" data-testid="install-link">{url}</p>
            <div className="mt-4"><ShareActions path={INSTALL_PATH} text="Get EAR — anonymous questions & replies" /></div>
          </div>
        </div>
      </section>
    </div>
  );
}
