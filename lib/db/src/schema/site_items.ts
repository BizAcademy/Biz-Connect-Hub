import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Formations configurables (bannière + lien)
export const trainingsTable = pgTable("trainings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  bannerUrl: text("banner_url").notNull().default(""),
  linkUrl: text("link_url").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Témoignages (vidéo ou capture d'écran)
export const testimonialsTable = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull().default(""),
  duration: text("duration").notNull().default(""),
  text: text("text").notNull().default(""),
  mediaUrl: text("media_url").notNull().default(""),
  mediaType: text("media_type").notNull().default("image"), // 'image' | 'video'
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Aperçus portefeuille (captures d'écran téléphone)
export const portfolioItemsTable = pgTable("portfolio_items", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Ambassadeurs (capture d'écran + nom + pays)
export const ambassadorsTable = pgTable("ambassadors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull().default(""),
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Logos partenaires
export const partnersTable = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  logoUrl: text("logo_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Logos moyens de paiement
export const paymentMethodsTable = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  logoUrl: text("logo_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Services "Voici ce que tu vas gagner" (icône + titre + description)
export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  iconUrl: text("icon_url").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Témoignages liés à un service (« Voir le témoignage » sur chaque carte service)
export const serviceTestimonialsTable = pgTable("service_testimonials", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  name: text("name").notNull(),
  country: text("country").notNull().default(""),
  mediaUrl: text("media_url").notNull(),
  mediaType: text("media_type").notNull().default("image"), // 'image' | 'video'
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Listes d'avantages ('included' = tout ce qui est inclus, 'offer' = carte de prix)
export const featureItemsTable = pgTable("feature_items", {
  id: serial("id").primaryKey(),
  section: text("section").notNull().default("included"), // 'included' | 'offer'
  label: text("label").notNull(),
  imageUrl: text("image_url").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Vidéos du centre d'aide
export const helpVideosTable = pgTable("help_videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  videoUrl: text("video_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Questions fréquentes affichées sur la page d'accueil
export const faqsTable = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertServiceSchema = createInsertSchema(servicesTable).omit({ id: true, createdAt: true });
export const insertServiceTestimonialSchema = createInsertSchema(serviceTestimonialsTable).omit({ id: true, createdAt: true });
export type ServiceTestimonial = typeof serviceTestimonialsTable.$inferSelect;
export type InsertServiceTestimonial = z.infer<typeof insertServiceTestimonialSchema>;
export const insertFeatureItemSchema = createInsertSchema(featureItemsTable).omit({ id: true, createdAt: true });
export const insertHelpVideoSchema = createInsertSchema(helpVideosTable).omit({ id: true, createdAt: true });
export const insertFaqSchema = createInsertSchema(faqsTable).omit({ id: true, createdAt: true });
export type Service = typeof servicesTable.$inferSelect;
export type FeatureItem = typeof featureItemsTable.$inferSelect;
export type HelpVideo = typeof helpVideosTable.$inferSelect;
export type Faq = typeof faqsTable.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertFeatureItem = z.infer<typeof insertFeatureItemSchema>;
export type InsertHelpVideo = z.infer<typeof insertHelpVideoSchema>;
export type InsertFaq = z.infer<typeof insertFaqSchema>;

export const insertTrainingSchema = createInsertSchema(trainingsTable).omit({ id: true, createdAt: true });
export const insertTestimonialSchema = createInsertSchema(testimonialsTable).omit({ id: true, createdAt: true });
export const insertPortfolioItemSchema = createInsertSchema(portfolioItemsTable).omit({ id: true, createdAt: true });
export const insertAmbassadorSchema = createInsertSchema(ambassadorsTable).omit({ id: true, createdAt: true });
export const insertPartnerSchema = createInsertSchema(partnersTable).omit({ id: true, createdAt: true });
export const insertPaymentMethodSchema = createInsertSchema(paymentMethodsTable).omit({ id: true, createdAt: true });

export type Training = typeof trainingsTable.$inferSelect;
export type Testimonial = typeof testimonialsTable.$inferSelect;
export type PortfolioItem = typeof portfolioItemsTable.$inferSelect;
export type Ambassador = typeof ambassadorsTable.$inferSelect;
export type InsertAmbassador = z.infer<typeof insertAmbassadorSchema>;
export type Partner = typeof partnersTable.$inferSelect;
export type PaymentMethod = typeof paymentMethodsTable.$inferSelect;
export type InsertTraining = z.infer<typeof insertTrainingSchema>;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type InsertPortfolioItem = z.infer<typeof insertPortfolioItemSchema>;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
