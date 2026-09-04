ALTER TABLE "feature_items"
ADD COLUMN IF NOT EXISTS "image_url" text DEFAULT '' NOT NULL;