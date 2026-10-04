import { useState } from "react";
import { Ban, Search, ShieldCheck, ShieldOff, UserCheck } from "lucide-react";
import type { AdminUserDto, UserStatus } from "@unsaid/shared";
import { USER_STATUSES } from "@unsaid/shared";
import { useAuth } from "../auth";
import { client, errorMessage } from "../lib/client";
import { useAsync, useDebounced, usePaged } from "../lib/hooks";
import { allowedUserActions, cleanNote, formatDate, formatNumber, formatRelative, type UserAction } from "../lib/format";
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, LoadMore, Modal, PageHeader, SkeletonRows, StatusBadge, Table, useToast, type Column } from "../ui";

const ACTION_COPY: Record<UserAction, { label: string; title: string; danger: boolean; done: string; body: (u: AdminUserDto) => string }> = {
  suspend: { label: "Suspend", title: "Suspend user", danger: false, done: "User suspended", body: (u) => `@${u.username} will be unable to sign in or receive messages until unsuspended.` },
  unsuspend: { label: "Unsuspend", title: "Unsuspend user", danger: false, done: "User unsuspended", body: (u) => `@${u.username} will regain access.` },
  ban: { label: "Ban", title: "Ban user", danger: true, done: "User banned", body: (u) => `@${u.username} will be permanently banned and their profile removed from public view.` },
  unban: { label: "Unban", title: "Unban user", danger: false, done: "User unbanned", body: (u) => `@${u.username} will regain access.` }
};
const ICON: Record<UserAction, typeof Ban> = { suspend: ShieldOff, unsuspend: UserCheck, ban: Ban, unban: UserCheck };

export function UsersPage() {
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
    { key: "user", header: "User", render: (u) => <span className="cell-main"><strong>@{u.username}</strong><span className="muted small">{u.email}</span></span> },
    { key: "status", header: "Status", render: (u) => <span className="badges"><StatusBadge status={u.status} />{u.role !== "user" && <Badge tone="info">{u.role}</Badge>}{!u.emailVerified && <Badge>unverified</Badge>}</span> },
    { key: "msgs", header: "Messages", className: "num", render: (u) => formatNumber(u.messagesReceived) },
    { key: "rep", header: "Reports", className: "num", render: (u) => formatNumber(u.reportsFiled) },
    { key: "seen", header: "Last seen", render: (u) => formatRelative(u.lastSeenAt) },
    { key: "joined", header: "Joined", render: (u) => formatDate(u.createdAt) }
  ];

  return (
    <>
      <PageHeader title="Users" subtitle="Search by username, email or id." />
      <div className="toolbar">
        <label className="search">
          <Search size={16} aria-hidden />
          <span className="sr-only">Search users</span>
          <input className="input" type="search" placeholder="Username, email or id" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="select-wrap">
          <span className="sr-only">Status</span>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as "" | UserStatus)}>
            <option value="">All statuses</option>
            {USER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      {list.loading ? <SkeletonRows label="Loading users" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.items.length === 0 ? (
        <EmptyState title="No users found" hint={dq || status ? "Try a different search or filter." : "Nobody has signed up yet."} />
      ) : (
        <>
          <Table caption="Users" columns={columns} rows={list.items} rowKey={(u) => u.id} onRowClick={setSelected} rowLabel={(u) => `@${u.username}`} />
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} error={list.moreError} onClick={list.loadMore} shown={list.items.length} />
        </>
      )}
      {selected && <UserDrawer user={selected} onClose={() => setSelected(null)} onUpdated={patch} />}
    </>
  );
}

function UserDrawer({ user, onClose, onUpdated }: { user: AdminUserDto; onClose: () => void; onUpdated: (u: AdminUserDto) => void }) {
  const { user: me } = useAuth();
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
      toast.success(ACTION_COPY[action].done);
      setAction(null);
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };

  const rows: [string, string][] = [
    ["Display name", u.displayName || "–"], ["Email", u.email], ["Email verified", u.emailVerified ? "Yes" : "No"], ["Role", u.role],
    ["Messages received", formatNumber(u.messagesReceived)], ["Reports filed", formatNumber(u.reportsFiled)],
    ["Joined", formatDate(u.createdAt)], ["Last seen", formatRelative(u.lastSeenAt)], ["User id", u.id]
  ];

  return (
    <>
      <Modal open variant="drawer" title={`@${u.username}`} onClose={onClose}
        footer={actions.length === 0 ? <span className="muted small">No actions available for your role.</span> : <>
          {actions.map((a) => { const I = ICON[a]; return <Button key={a} variant={ACTION_COPY[a].danger ? "danger" : "secondary"} icon={<I size={16} aria-hidden />} onClick={() => setAction(a)}>{ACTION_COPY[a].label}</Button>; })}
        </>}>
        <div className="drawer-status"><StatusBadge status={u.status} />{fresh.loading && <span className="muted small">Refreshing…</span>}</div>
        {fresh.error && <p className="text-danger small" role="alert">Couldn't refresh details: {fresh.error}</p>}
        <dl className="kv">
          {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={k === "User id" ? "mono" : undefined}>{v}</dd></div>)}
        </dl>
        <p className="muted small"><ShieldCheck size={14} aria-hidden style={{ verticalAlign: "-2px" }} /> Every action is recorded in the audit log.</p>
      </Modal>
      {action && (
        <ConfirmDialog open title={ACTION_COPY[action].title} confirmLabel={ACTION_COPY[action].label} danger={ACTION_COPY[action].danger}
          body={<p>{ACTION_COPY[action].body(u)}</p>} onClose={() => setAction(null)} onConfirm={run} />
      )}
    </>
  );
}
