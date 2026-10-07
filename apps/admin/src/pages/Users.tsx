import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Ban, Search, ShieldCheck, ShieldOff, UserCheck } from "lucide-react";
import type { AdminUserDto, UserStatus } from "@unsaid/shared";
import { USER_STATUSES } from "@unsaid/shared";
import { useAuth } from "../auth";
import { client, errorMessage } from "../lib/client";
import { useAsync, useDebounced, usePaged } from "../lib/hooks";
import { allowedUserActions, cleanNote, type UserAction } from "../lib/format";
import { useT, type Key } from "../i18n";
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, LoadMore, Ltr, Modal, PageHeader, SkeletonRows, StatusBadge, Table, useToast, type Column } from "../ui";

const DANGER: Record<UserAction, boolean> = { suspend: false, unsuspend: false, ban: true, unban: false };
const key = (a: UserAction, part: "" | ".title" | ".done" | ".body") => `users.action.${a}${part}` as Key;
const ICON: Record<UserAction, typeof Ban> = { suspend: ShieldOff, unsuspend: UserCheck, ban: Ban, unban: UserCheck };

export function UsersPage() {
  const { t, te, fmt } = useT();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | UserStatus>("");
  const dq = useDebounced(q.trim(), 300);
  const list = usePaged((cursor) => client.admin.users({ q: dq || undefined, status: status || undefined, cursor, limit: 25 }), [dq, status]);
  const [selected, setSelected] = useState<AdminUserDto | null>(null);

  const patch = (u: AdminUserDto) => {
    list.setItems((l) => l.map((x) => (x.id === u.id ? u : x)));
    setSelected((s) => (s && s.id === u.id ? u : s));
  };

  const columns: Column<AdminUserDto>[] = [
    { key: "user", header: t("users.col.user"), render: (u) => <span className="cell-main"><strong><Ltr>@{u.username}</Ltr></strong><Ltr className="muted small">{u.email}</Ltr></span> },
    { key: "status", header: t("users.col.status"), render: (u) => <span className="badges"><StatusBadge status={u.status} />{u.role !== "user" && <Badge tone="info">{te("role", u.role)}</Badge>}{!u.emailVerified && <Badge>{t("common.unverified")}</Badge>}</span> },
    { key: "msgs", header: t("users.col.messages"), className: "num", render: (u) => fmt.number(u.messagesReceived) },
    { key: "rep", header: t("users.col.reportsFiled"), className: "num", render: (u) => fmt.number(u.reportsFiled) },
    { key: "seen", header: t("users.col.lastSeen"), render: (u) => fmt.relative(u.lastSeenAt) },
    { key: "joined", header: t("users.col.joined"), render: (u) => fmt.date(u.createdAt) }
  ];

  return (
    <>
      <PageHeader title={t("users.title")} subtitle={t("users.subtitle")} />
      <div className="toolbar">
        <label className="search">
          <Search size={16} aria-hidden />
          <span className="sr-only">{t("users.searchLabel")}</span>
          <input className="input" type="search" placeholder={t("users.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="select-wrap">
          <span className="sr-only">{t("users.statusLabel")}</span>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as "" | UserStatus)}>
            <option value="">{t("users.allStatuses")}</option>
            {USER_STATUSES.map((s) => <option key={s} value={s}>{te("status", s)}</option>)}
          </select>
        </label>
      </div>
      {list.loading ? <SkeletonRows label={t("users.loading")} /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.items.length === 0 ? (
        <EmptyState title={t("users.empty")} hint={dq || status ? t("users.emptyFiltered") : t("users.emptyNone")} />
      ) : (
        <>
          <Table caption={t("users.caption")} columns={columns} rows={list.items} rowKey={(u) => u.id} onRowClick={setSelected} rowLabel={(u) => `@${u.username}`} />
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} error={list.moreError} onClick={list.loadMore} shown={list.items.length} />
        </>
      )}
      {selected && <UserDrawer user={selected} onClose={() => setSelected(null)} onUpdated={patch} />}
    </>
  );
}

function UserDrawer({ user, onClose, onUpdated }: { user: AdminUserDto; onClose: () => void; onUpdated: (u: AdminUserDto) => void }) {
  const { user: me } = useAuth();
  const { t, te, fmt } = useT();
  const toast = useToast();
  const fresh = useAsync(() => client.admin.user(user.id), [user.id]);
  const u = fresh.data ?? user;
  const [action, setAction] = useState<UserAction | null>(null);
  const actions = allowedUserActions(me?.role, u.status);

  const run = async (note: string) => {
    if (!action) return;
    const n = cleanNote(note);
    try {
      const updated = action === "suspend" ? await client.admin.suspend(u.id, n)
        : action === "ban" ? await client.admin.ban(u.id, n)
        : action === "unban" ? await client.admin.unban(u.id, n)
        : await client.admin.unsuspend(u.id, n);
      onUpdated(updated);
      fresh.reload(true);
      toast.success(t(key(action, ".done")));
      setAction(null);
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };

  const rows: { k: string; label: string; value: ReactNode; ltr?: boolean }[] = [
    { k: "name", label: t("users.drawer.displayName"), value: u.displayName || "–" },
    { k: "email", label: t("users.drawer.email"), value: <Ltr>{u.email}</Ltr> },
    { k: "ver", label: t("users.drawer.emailVerified"), value: u.emailVerified ? t("common.yes") : t("common.no") },
    { k: "role", label: t("users.drawer.role"), value: te("role", u.role) },
    { k: "msgs", label: t("users.drawer.messages"), value: fmt.number(u.messagesReceived) },
    { k: "rep", label: t("users.drawer.reportsFiled"), value: fmt.number(u.reportsFiled) },
    { k: "joined", label: t("users.drawer.joined"), value: fmt.date(u.createdAt) },
    { k: "seen", label: t("users.drawer.lastSeen"), value: fmt.relative(u.lastSeenAt) },
    { k: "id", label: t("users.drawer.id"), value: <Ltr className="mono">{u.id}</Ltr> }
  ];

  return (
    <>
      <Modal open variant="drawer" title={<Ltr>@{u.username}</Ltr>} onClose={onClose}
        footer={actions.length === 0 ? <span className="muted small">{t("users.drawer.noActions")}</span> : <>
          {actions.map((a) => { const I = ICON[a]; return <Button key={a} variant={DANGER[a] ? "danger" : "secondary"} icon={<I size={16} aria-hidden />} onClick={() => setAction(a)}>{t(key(a, ""))}</Button>; })}
        </>}>
        <div className="drawer-status"><StatusBadge status={u.status} />{fresh.loading && <span className="muted small">{t("users.drawer.refreshing")}</span>}</div>
        {fresh.error && <p className="text-danger small" role="alert">{t("users.drawer.refreshFailed", { error: fresh.error })}</p>}
        <dl className="kv">
          {rows.map((x) => <div key={x.k}><dt>{x.label}</dt><dd>{x.value}</dd></div>)}
        </dl>
        <p><Link className="btn btn-sm btn-secondary" to={`/users/${u.id}`}>{t("user.fullProfile")}</Link></p>
        <p className="muted small"><ShieldCheck size={14} aria-hidden style={{ verticalAlign: "-2px" }} /> {t("users.drawer.audited")}</p>
      </Modal>
      {action && (
        <ConfirmDialog open title={t(key(action, ".title"))} confirmLabel={t(key(action, ""))} danger={DANGER[action]}
          body={<p>{t(key(action, ".body"), { username: `@${u.username}` })}</p>} onClose={() => setAction(null)} onConfirm={run} />
      )}
    </>
  );
}
