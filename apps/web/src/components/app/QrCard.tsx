"use client";

import { useEffect, useState } from "react";
import { Download, QrCode } from "lucide-react";
import { useT } from "@/i18n/client";
import { buttonClasses } from "@/components/ui/Button";

/** Scannable QR for the public link (always dark-on-white for reliable scanning) with PNG download. */
export function QrCard({ path, name = "ear-qr" }: { path: string; name?: string }) {
  const { t } = useT();
  const [src, setSrc] = useState<string | null>(null);
  const [big, setBig] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    let live = true;
    const abs = new URL(path, window.location.origin).toString();
    setUrl(abs);
    void import("qrcode").then(async (QR) => {
      const opts = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#1c0f2e", light: "#ffffff" } };
      const [a, b] = await Promise.all([QR.toDataURL(abs, { ...opts, width: 320 }), QR.toDataURL(abs, { ...opts, width: 1024 })]);
      if (live) { setSrc(a); setBig(b); }
    }).catch(() => undefined);
    return () => { live = false; };
  }, [path]);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="rounded-2xl p-1 shadow-[0_18px_44px_-20px_var(--grad-2)] transition-transform duration-300 hover:rotate-1 hover:scale-[1.03]" style={{ background: "var(--grad-brand)" }}>
        <div className="grid size-44 place-items-center overflow-hidden rounded-[0.9rem] bg-white">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={t("app.links.qrAlt", { url })} width={176} height={176} className="animate-pop size-full" />
          ) : <QrCode className="size-10 animate-pulse text-muted" aria-hidden />}
        </div>
      </div>
      <div className="text-center sm:text-start">
        <h3 className="font-bold">{t("app.links.qrTitle")}</h3>
        <p className="mt-1 max-w-xs text-sm text-muted">{t("app.links.qrBody")}</p>
        <a href={big ?? undefined} download={`${name}.png`} aria-disabled={!big} className={buttonClasses("secondary", "md", "mt-3 " + (big ? "" : "pointer-events-none opacity-60"))}>
          <Download className="size-4" aria-hidden />{t("app.links.qrDownload")}
        </a>
      </div>
    </div>
  );
}
