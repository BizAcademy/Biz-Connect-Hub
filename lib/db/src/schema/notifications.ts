import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  action: text("action").notNull().default("vient de s'inscrire"),
  time: text("time").notNull().default("il y a quelques instants"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
