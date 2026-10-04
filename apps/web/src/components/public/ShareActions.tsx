"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { Button, useToast } from "@/components/ui";

export function shareLinks(url: string, text: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return [
    { id: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
    { id: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: "email", label: "Email", href: `mailto:?subject=${t}&body=${u}` }
  ];
}

/** Copy link, native Web Share, share-card download and platform links. `path` is the site-relative page. */
export function ShareActions({ path, text, cardPath, compact }: { path: string; text: string; cardPath?: string; compact?: boolean }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  const [url, setUrl] = useState(path);

  useEffect(() => {
    setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function");
    setUrl(new URL(path, window.location.origin).toString());
  }, [path]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
    }
  }
  async function native() {
    try { await navigator.share({ title: "EAR", text, url }); } catch { /* cancelled */ }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={copy} variant="secondary" leading={copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}>{copied ? "Copied" : "Copy link"}</Button>
        {canNative && <Button onClick={native} leading={<Share2 className="size-4" aria-hidden />}>Share…</Button>}
        {cardPath && (
          <a href={cardPath} download="unsaid-answer.png" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 text-[0.95rem] font-semibold transition hover:bg-raised">
            <Download className="size-4" aria-hidden /> Download card
          </a>
        )}
      </div>
      {!compact && (
        <ul className="flex flex-wrap gap-2" aria-label="Share to">
          {shareLinks(url, text).map((l) => (
            <li key={l.id}>
              <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full bg-raised px-3.5 text-sm font-medium text-muted transition hover:text-fg">{l.label}<span className="sr-only"> (opens in a new tab)</span></a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
