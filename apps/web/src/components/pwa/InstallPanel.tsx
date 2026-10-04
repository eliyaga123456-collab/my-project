"use client";

import { useEffect, useState } from "react";
import { Apple, Check, Download, MonitorSmartphone, PlusSquare, Share, Smartphone } from "lucide-react";
import { Button, ButtonLink, useToast } from "@/components/ui";
import { ShareActions } from "@/components/public/ShareActions";
import { ANDROID_APP_URL, INSTALL_PATH, IOS_APP_URL } from "@/lib/site";
import { usePwaInstall } from "./usePwaInstall";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-raised text-sm font-bold text-primary" aria-hidden>{n}</span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

export function InstallPanel({ qrDataUri }: { qrDataUri: string }) {
  const toast = useToast();
  const { ready, platform, installed, canPrompt, install } = usePwaInstall();
  const [url, setUrl] = useState(INSTALL_PATH);
  useEffect(() => { setUrl(new URL(INSTALL_PATH, window.location.origin).toString()); }, []);

  async function doInstall() {
    const r = await install();
    if (r === "accepted") toast.success("EAR is being added to your device");
  }
  const storeUrl = platform === "ios" ? IOS_APP_URL : platform === "android" ? ANDROID_APP_URL : "";

  return (
    <div className="space-y-6">
      {installed && (
        <div role="status" className="rounded-lg border border-success/40 bg-success/10 p-5 text-center">
          <Check className="mx-auto size-8 text-success" aria-hidden />
          <p className="mt-2 text-lg font-bold">EAR is already installed on this device</p>
          <ButtonLink href="/inbox" className="mt-3">Open my inbox</ButtonLink>
        </div>
      )}

      {!installed && ready && (
        <section aria-labelledby="install-now" className="veil p-5 sm:p-7">
          <div className="relative">
            <h2 id="install-now" className="flex items-center gap-2 text-xl font-bold"><Smartphone className="size-5 text-primary" aria-hidden />
              {platform === "ios" ? "Install on iPhone / iPad" : platform === "android" ? "Install on Android" : "Install on this computer"}</h2>

            {storeUrl && <ButtonLink href={storeUrl} size="lg" className="mt-4 w-full sm:w-auto">
              {platform === "ios" ? <Apple className="size-4" aria-hidden /> : <Download className="size-4" aria-hidden />}
              {platform === "ios" ? "Get it on the App Store" : "Get it on Google Play"}</ButtonLink>}

            {canPrompt && (
              <Button size="lg" className="mt-4 w-full sm:w-auto" onClick={doInstall} leading={<Download className="size-4" aria-hidden />}>
                {storeUrl ? "Or install the web app" : "Install EAR"}
              </Button>
            )}

            {platform === "ios" && !storeUrl && (
              <>
                <p className="mt-3 text-muted">Open this page in <strong>Safari</strong>, then:</p>
                <ol className="mt-4 space-y-3">
                  <Step n={1}>Tap the <Share className="mx-1 inline size-4 align-text-bottom" aria-label="Share" /> <strong>Share</strong> button in the toolbar.</Step>
                  <Step n={2}>Scroll and tap <PlusSquare className="mx-1 inline size-4 align-text-bottom" aria-hidden /> <strong>Add to Home Screen</strong>.</Step>
                  <Step n={3}>Tap <strong>Add</strong>. EAR now opens full screen from your home screen.</Step>
                </ol>
              </>
            )}
            {platform === "android" && !canPrompt && !storeUrl && (
              <>
                <p className="mt-3 text-muted">Open this page in <strong>Chrome</strong>, then:</p>
                <ol className="mt-4 space-y-3">
                  <Step n={1}>Tap the <strong>⋮</strong> menu.</Step>
                  <Step n={2}>Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</Step>
                </ol>
              </>
            )}
            {platform === "desktop" && !canPrompt && (
              <p className="mt-3 text-muted">In Chrome or Edge, click the install icon <Download className="mx-1 inline size-4 align-text-bottom" aria-hidden /> at the right of the address bar. On your phone, scan the code below.</p>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="send-link" className="veil p-5 sm:p-7">
        <div className="relative grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUri} alt="QR code that opens the EAR install page" width={176} height={176} className="mx-auto size-44 rounded-xl bg-white p-3" />
          <div>
            <h2 id="send-link" className="flex items-center gap-2 text-xl font-bold"><MonitorSmartphone className="size-5 text-secondary" aria-hidden />Send the install link</h2>
            <p className="mt-1 text-muted">Anyone who opens it gets the right steps for their phone. Share it in your story, bio or group chat.</p>
            <p className="mt-3 break-all rounded-md bg-raised px-3 py-2 font-mono text-sm" data-testid="install-link">{url}</p>
            <div className="mt-4"><ShareActions path={INSTALL_PATH} text="Get EAR — anonymous questions & replies" /></div>
          </div>
        </div>
      </section>
    </div>
  );
}
