CREATE TABLE "visitor_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "visitor_id" text NOT NULL,
  "session_id" text NOT NULL,
  "event_type" text NOT NULL,
  "event_name" text DEFAULT '' NOT NULL,
  "path" text DEFAULT '/' NOT NULL,
  "country" text DEFAULT 'Inconnu' NOT NULL,
  "duration_seconds" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "visitor_events_created_at_idx" ON "visitor_events" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "visitor_events_country_idx" ON "visitor_events" USING btree ("country");
--> statement-breakpoint
CREATE INDEX "visitor_events_event_type_idx" ON "visitor_events" USING btree ("event_type");
--> statement-breakpoint
CREATE INDEX "visitor_events_event_name_idx" ON "visitor_events" USING btree ("event_name");
--> statement-breakpoint
CREATE INDEX "visitor_events_session_id_idx" ON "visitor_events" USING btree ("session_id");