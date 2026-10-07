import { Link } from "react-router-dom";
import { Mail, MessageCircle, UserRound } from "lucide-react";
import type { UserStatus } from "@unsaid/shared";
import { whatsappLink } from "../lib/format";
import { useT } from "../i18n";
import { Ltr } from "./Ltr";
import { StatusBadge } from "./Badge";

export interface OwnerInfo { id: string; username: string; displayName: string; email: string; whatsapp: string | null; status: UserStatus }

/** Who owns something: name, status, email and (only when they gave one) a WhatsApp chat button. */
export function OwnerBlock({ owner, profileLink = true }: { owner: OwnerInfo; profileLink?: boolean }) {
  const { t } = useT();
  const wa = whatsappLink(owner.whatsapp);
  return (
    <div className="owner">
      <div className="owner-id">
        <span className="avatar" aria-hidden><UserRound size={22} /></span>
        <div className="owner-names">
          <strong dir="auto">{owner.displayName || owner.username}</strong>
          <Ltr className="muted small">@{owner.username}</Ltr>
        </div>
        <StatusBadge status={owner.status} />
      </div>
      <div className="owner-actions">
        {wa ? (
          <a className="btn btn-wa" href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden />{t("round.whatsapp")}<Ltr className="wa-num">{owner.whatsapp}</Ltr></a>
        ) : <p className="muted small">{t("round.noWhatsapp")}</p>}
        <a className="btn btn-secondary" href={`mailto:${owner.email}`}><Mail size={18} aria-hidden /><Ltr>{owner.email}</Ltr></a>
        {profileLink && <Link className="btn btn-ghost" to={`/users/${owner.id}`}>{t("round.openProfile")}</Link>}
      </div>
    </div>
  );
}
