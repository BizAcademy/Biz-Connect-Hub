import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const visitorEventsTable = pgTable(
  "visitor_events",
  {
    id: serial("id").primaryKey(),
    visitorId: text("visitor_id").notNull(),
    sessionId: text("session_id").notNull(),
    eventType: text("event_type").notNull(),
    eventName: text("event_name").notNull().default(""),
    path: text("path").notNull().default("/"),
    country: text("country").notNull().default("Inconnu"),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("visitor_events_created_at_idx").on(table.createdAt),
    index("visitor_events_country_idx").on(table.country),
    index("visitor_events_event_type_idx").on(table.eventType),
    index("visitor_events_event_name_idx").on(table.eventName),
    index("visitor_events_session_id_idx").on(table.sessionId),
  ],
);

export type VisitorEvent = typeof visitorEventsTable.$inferSelect;