-- Interface language per user (drives emails and notification text).
ALTER TABLE users ADD COLUMN locale text NOT NULL DEFAULT 'en' CHECK (locale IN ('en','he'));
