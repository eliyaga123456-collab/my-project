-- "Rounds": every extra link can be an anonymous Q&A round with its own question and optional closing time.
ALTER TABLE links ADD COLUMN prompt text CHECK (prompt IS NULL OR char_length(prompt) BETWEEN 1 AND 120);
ALTER TABLE links ADD COLUMN closes_at timestamptz;
CREATE INDEX messages_link_idx ON messages (link_id, created_at DESC) WHERE link_id IS NOT NULL;
