"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import type { SendTarget } from "./SendForm";

/** Counts one profile view from the visitor's browser (SSR can't see the real client). */
export function RecordView({ target }: { target: SendTarget }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    api.profile.recordView(target).catch(() => undefined);
  }, [target]);
  return null;
}
