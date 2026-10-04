"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { InputField } from "@/components/ui";
import { passwordRules } from "@/lib/password";
import { Check, Circle } from "lucide-react";
import type { ComponentProps } from "react";

export function PasswordField({ showRules, ...props }: Omit<ComponentProps<typeof InputField>, "type" | "trailing"> & { showRules?: boolean }) {
  const [show, setShow] = useState(false);
  const value = typeof props.value === "string" ? props.value : "";
  return (
    <div>
      <InputField
        {...props}
        type={show ? "text" : "password"}
        trailing={
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} className="grid size-9 place-items-center rounded-full text-muted hover:text-fg">
            {show ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        }
      />
      {showRules && (
        <ul aria-label="Password rules" className="mt-2 space-y-1 text-[0.82rem]">
          {passwordRules(value).map((r) => (
            <li key={r.id} className={r.ok ? "flex items-center gap-2 text-success" : "flex items-center gap-2 text-muted"}>
              {r.ok ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
              {r.label}
              <span className="sr-only">{r.ok ? " (met)" : " (not met yet)"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
