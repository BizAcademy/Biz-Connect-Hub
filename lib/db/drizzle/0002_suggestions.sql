CREATE TABLE IF NOT EXISTS "suggestions" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "country" text NOT NULL,
  "message" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_content" ADD COLUMN IF NOT EXISTS "suggestions_intro_text" text DEFAULT 'Faite nous parvenir vos suggestions, dans cette espace, vous pouvez nous faire parvenir vos suggestions afin que nous puissions résoudre efficacement certains problème que vous rencontrez et ensemble nous ferons évoluer notre communauté' NOT NULL;