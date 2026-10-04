-- EAR initial schema. All timestamps are timestamptz (UTC).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                text NOT NULL,
  password_hash        text NOT NULL,
  username             text NOT NULL,
  role                 text NOT NULL DEFAULT 'user'      CHECK (role IN ('user','moderator','admin')),
  status               text NOT NULL DEFAULT 'active'    CHECK (status IN ('active','suspended','banned')),
  email_verified_at    timestamptz,
  username_changed_at  timestamptz,
  last_seen_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_lower CHECK (email = lower(email)),
  CONSTRAINT users_username_lower CHECK (username = lower(username)),
  CONSTRAINT users_username_format CHECK (username ~ '^[a-z0-9]([a-z0-9_]*[a-z0-9])?$' AND char_length(username) BETWEEN 3 AND 24)
);
CREATE UNIQUE INDEX users_email_key ON users (email);
CREATE UNIQUE INDEX users_username_key ON users (username);
CREATE INDEX users_status_idx ON users (status);
CREATE INDEX users_created_idx ON users (created_at DESC, id DESC);

CREATE TABLE profiles (
  user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name  text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
  bio           text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 160),
  prompt        text NOT NULL DEFAULT 'Send me an anonymous message' CHECK (char_length(prompt) <= 80),
  avatar_key    text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE settings (
  user_id               uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enhanced_moderation   boolean NOT NULL DEFAULT false,
  accepting_messages    boolean NOT NULL DEFAULT true,
  show_answers_publicly boolean NOT NULL DEFAULT true,
  notifications         jsonb NOT NULL DEFAULT '{"inAppNewMessage":true,"pushNewMessage":true,"emailNewMessage":false,"emailDigest":false,"pushActivity":true,"emailSafety":true}'::jsonb,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug          text NOT NULL CHECK (slug ~ '^[A-Za-z0-9_-]{4,32}$'),
  label         text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 40),
  is_primary    boolean NOT NULL DEFAULT false,
  paused        boolean NOT NULL DEFAULT false,
  paused_until  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX links_slug_key ON links (slug);
CREATE UNIQUE INDEX links_one_primary_per_user ON links (user_id) WHERE is_primary;
CREATE INDEX links_user_idx ON links (user_id, created_at);

CREATE TABLE link_daily_stats (
  link_id   uuid NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  day       date NOT NULL,
  views     integer NOT NULL DEFAULT 0,
  messages  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (link_id, day)
);

CREATE TABLE messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  link_id             uuid REFERENCES links(id) ON DELETE SET NULL,
  body                text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  status              text NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox','filtered','archived')),
  read_at             timestamptz,
  source_hash         text,            -- HMAC(ip); nulled after retention window. Never exposed.
  device_hash         text,            -- HMAC(anon device cookie); nulled after retention window.
  body_hash           text NOT NULL,   -- HMAC(normalised body) for duplicate detection
  filtered_categories text[] NOT NULL DEFAULT '{}',
  reply_text          text CHECK (reply_text IS NULL OR char_length(reply_text) BETWEEN 1 AND 2000),
  reply_public        boolean NOT NULL DEFAULT false,
  replied_at          timestamptz,
  answer_id           uuid UNIQUE,     -- public id for a published answer (distinct from message id)
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_inbox_idx ON messages (recipient_id, status, created_at DESC, id DESC);
CREATE INDEX messages_recipient_source_idx ON messages (recipient_id, source_hash) WHERE source_hash IS NOT NULL;
CREATE INDEX messages_recipient_body_idx ON messages (recipient_id, body_hash, created_at DESC);
CREATE INDEX messages_source_time_idx ON messages (source_hash, created_at DESC) WHERE source_hash IS NOT NULL;
CREATE INDEX messages_answers_idx ON messages (recipient_id, replied_at DESC, id DESC) WHERE reply_public AND answer_id IS NOT NULL;
CREATE INDEX messages_created_idx ON messages (created_at DESC);

CREATE TABLE blocks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_hash  text,
  device_hash  text,
  label        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blocks_has_target CHECK (source_hash IS NOT NULL OR device_hash IS NOT NULL)
);
CREATE UNIQUE INDEX blocks_owner_source_key ON blocks (owner_id, source_hash) WHERE source_hash IS NOT NULL;
CREATE UNIQUE INDEX blocks_owner_device_key ON blocks (owner_id, device_hash) WHERE device_hash IS NOT NULL;
CREATE INDEX blocks_owner_idx ON blocks (owner_id, created_at DESC);

CREATE TABLE reports (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id           uuid REFERENCES messages(id) ON DELETE SET NULL,
  reporter_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason               text NOT NULL CHECK (reason IN ('harassment','threat','hate','sexual','self_harm','personal_info','spam','other')),
  details              text CHECK (details IS NULL OR char_length(details) <= 500),
  status               text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  resolution           text,
  resolved_by          uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at          timestamptz,
  message_body         text NOT NULL,           -- snapshot so evidence survives deletion
  message_created_at   timestamptz NOT NULL,
  filtered_categories  text[] NOT NULL DEFAULT '{}',
  source_hash          text,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX reports_reporter_message_key ON reports (reporter_id, message_id) WHERE message_id IS NOT NULL;
CREATE INDEX reports_status_idx ON reports (status, created_at DESC, id DESC);
CREATE INDEX reports_source_idx ON reports (source_hash) WHERE source_hash IS NOT NULL;

CREATE TABLE sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    text NOT NULL,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz
);
CREATE UNIQUE INDEX sessions_token_key ON sessions (token_hash);
CREATE INDEX sessions_user_idx ON sessions (user_id) WHERE revoked_at IS NULL;

CREATE TABLE email_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('verify','reset')),
  token_hash  text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX email_tokens_hash_key ON email_tokens (token_hash);
CREATE INDEX email_tokens_user_idx ON email_tokens (user_id, kind);

CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('new_message','message_activity','safety')),
  title       text NOT NULL,
  body        text NOT NULL,
  data        jsonb,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC, id DESC);
CREATE INDEX notifications_unread_idx ON notifications (user_id) WHERE read_at IS NULL;

CREATE TABLE push_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       text NOT NULL,
  platform    text NOT NULL CHECK (platform IN ('ios','android','web')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX push_tokens_token_key ON push_tokens (token);
CREATE INDEX push_tokens_user_idx ON push_tokens (user_id);

CREATE TABLE hidden_words (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word        text NOT NULL CHECK (char_length(word) BETWEEN 2 AND 40),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX hidden_words_user_word_key ON hidden_words (user_id, word);

CREATE TABLE moderation_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         text NOT NULL CHECK (kind IN ('message','report','admin_action')),
  outcome      text NOT NULL,        -- allow | hold | reject | flood | duplicate | blocked | remove | suspend | ban | dismiss ...
  categories   text[] NOT NULL DEFAULT '{}',
  score        integer NOT NULL DEFAULT 0,
  message_id   uuid REFERENCES messages(id) ON DELETE SET NULL,
  user_id      uuid REFERENCES users(id) ON DELETE SET NULL,   -- recipient / target
  source_hash  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moderation_events_time_idx ON moderation_events (created_at DESC, id DESC);
CREATE INDEX moderation_events_source_idx ON moderation_events (source_hash, created_at DESC) WHERE source_hash IS NOT NULL;
CREATE INDEX moderation_events_outcome_idx ON moderation_events (outcome, created_at DESC);

CREATE TABLE audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  action       text NOT NULL,
  target_type  text,
  target_id    text,
  meta         jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_time_idx ON audit_logs (created_at DESC, id DESC);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_id, created_at DESC);

CREATE TABLE email_outbox (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email    text NOT NULL,
  subject     text NOT NULL,
  body_text   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_outbox_to_idx ON email_outbox (to_email, created_at DESC);

-- Platform-wide bans of anonymous *sources* (by keyed hash). Senders are never linked to accounts.
CREATE TABLE banned_sources (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_hash  text NOT NULL,
  until        timestamptz,            -- NULL = permanent
  reason       text,
  created_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX banned_sources_hash_key ON banned_sources (source_hash);
