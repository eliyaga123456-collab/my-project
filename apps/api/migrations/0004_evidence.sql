-- Safety evidence for anonymous messages (disclosed in the privacy policy): the sender's network address is kept ENCRYPTED for a short window
-- (extended if the message is reported) and is only readable by an admin, every read being written to the audit log.
create table if not exists message_evidence (
  message_id uuid primary key references messages(id) on delete cascade,
  ip_enc text not null,
  channel text,
  user_agent text,
  created_at timestamptz not null default now(),
  keep_until timestamptz not null
);
create index if not exists message_evidence_keep_until_idx on message_evidence (keep_until);
