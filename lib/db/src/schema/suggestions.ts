import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const suggestionsTable = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSuggestionSchema = createInsertSchema(suggestionsTable).omit({ id: true, createdAt: true });
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;
export type Suggestion = typeof suggestionsTable.$inferSelect;