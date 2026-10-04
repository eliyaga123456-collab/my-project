"use client";

import { useEffect, useRef } from "react";
import type { SendTarget } from "./SendForm";

/** Counts one profile view from the visitor's browser (SSR can't see the real client). */
export function RecordView({ target }: { target: SendTarget }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    // Plain fetch keeps the API client (and zod) out of the public-page bundle.
    fetch("/api/v1/public/view", { method: "POST", credentials: "same-origin", keepalive: true, headers: { "content-type": "application/json", "x-requested-with": "unsaid", "x-client": "web" }, body: JSON.stringify(target) }).catch(() => undefined);
  }, [target]);
  return null;
}
