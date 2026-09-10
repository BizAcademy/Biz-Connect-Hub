ALTER TABLE "site_content"
ADD COLUMN IF NOT EXISTS "facebook_link" text DEFAULT '' NOT NULL,
ADD COLUMN IF NOT EXISTS "tiktok_link" text DEFAULT '' NOT NULL,
ADD COLUMN IF NOT EXISTS "instagram_link" text DEFAULT '' NOT NULL,
ADD COLUMN IF NOT EXISTS "youtube_link" text DEFAULT '' NOT NULL,
ADD COLUMN IF NOT EXISTS "whatsapp_channel_link" text DEFAULT '' NOT NULL;