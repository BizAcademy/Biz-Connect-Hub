import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Images en base (data URL privée, exposée via /api/media/:id/content)
// et références aux médias externes existants.
export const mediaTable = pgTable("media", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  url: text("url").notNull(),
  publicId: text("public_id").notNull(),
  resourceType: text("resource_type").notNull().default("image"), // 'image' | 'video'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMediaSchema = createInsertSchema(mediaTable).omit({ id: true, createdAt: true });
export type Media = typeof mediaTable.$inferSelect;
export type InsertMedia = z.infer<typeof insertMediaSchema>;
