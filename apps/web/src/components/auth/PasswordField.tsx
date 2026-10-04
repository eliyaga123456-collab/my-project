"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { InputField } from "@/components/ui";
import { passwordRules } from "@/lib/password";
import { LIMITS } from "@/lib/limits";
import { useT } from "@/i18n/client";
import { Check, Circle } from "lucide-react";
import type { ComponentProps } from "react";

export function PasswordField({ showRules, ...props }: Omit<ComponentProps<typeof InputField>, "type" | "trailing"> & { showRules?: boolean }) {
  const { t } = useT();
  const [show, setShow] = useState(false);
  const value = typeof props.value === "string" ? props.value : "";
  return (
    <div>
      <InputField
        {...props}
        type={show ? "text" : "password"}
        trailing={
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t("auth.password.hide") : t("auth.password.show")} aria-pressed={show} className="grid size-9 place-items-center rounded-full text-muted hover:text-fg">
            {show ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        }
      />
      {showRules && (
        <ul aria-label={t("auth.password.rules")} className="mt-2 space-y-1 text-[0.82rem]">
          {passwordRules(value).map((r) => (
            <li key={r.id} className={r.ok ? "flex items-center gap-2 text-success" : "flex items-center gap-2 text-muted"}>
              {r.ok ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
              {r.id === "len" ? t("auth.password.ruleLen", { min: LIMITS.passwordMin }) : r.id === "max" ? t("auth.password.ruleMax", { max: LIMITS.passwordMax }) : t("auth.password.ruleMix")}
              <span className="sr-only">{r.ok ? t("auth.password.met") : t("auth.password.notMet")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
