-- Profile frame (one of a fixed set) and an optional, owner-provided WhatsApp number for wa.me chat links.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_frame text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp text;
