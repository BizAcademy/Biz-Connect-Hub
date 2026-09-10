ALTER TABLE "site_content"
ADD COLUMN IF NOT EXISTS "telegram_channel_link" text DEFAULT '' NOT NULL;