import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const siteContentTable = pgTable("site_content", {
  id: serial("id").primaryKey(),
  heroTitle: text("hero_title").notNull().default("Rejoignez le Réseau Business le Plus Puissant d'Afrique"),
  heroSubtitle: text("hero_subtitle").notNull().default("Gagnez de l'argent par affiliation, développez votre visibilité, accédez à des formations exclusives."),
  heroCtaText: text("hero_cta_text").notNull().default("Rejoindre Maintenant"),
  memberCount: text("member_count").notNull().default("12,500+"),
  memberCountLabel: text("member_count_label").notNull().default("Membres actifs dans le réseau"),
  geoAvailability: text("geo_availability").notNull().default("Cameroun, Côte d'Ivoire, Sénégal, RDC, Mali, Gabon, Togo, Bénin, Burkina Faso, Guinée"),
  videoUrl: text("video_url").notNull().default("https://www.youtube.com/embed/dQw4w9WgXcQ"),
  offerPrice: text("offer_price").notNull().default("25,000 FCFA"),
  offerOriginalPrice: text("offer_original_price").notNull().default("50,000 FCFA"),
  offerLabel: text("offer_label").notNull().default("Inscriptions à vie"),
  level1Name: text("level1_name").notNull().default("Niveau Bronze"),
  level1Amount: text("level1_amount").notNull().default("2,500 FCFA"),
  level2Name: text("level2_name").notNull().default("Niveau Argent"),
  level2Amount: text("level2_amount").notNull().default("5,000 FCFA"),
  level3Name: text("level3_name").notNull().default("Niveau Or"),
  level3Amount: text("level3_amount").notNull().default("10,000 FCFA"),
  whatsappNumber: text("whatsapp_number").notNull().default("237690000000"),
  heroImageUrl: text("hero_image_url").notNull().default(""),
  signupUrl: text("signup_url").notNull().default("/inscription"),
  communityImageUrl: text("community_image_url").notNull().default(""),
  countriesIconUrl: text("countries_icon_url").notNull().default(""),
  gainsPosterUrl: text("gains_poster_url").notNull().default(""),
  telegramLink: text("telegram_link").notNull().default(""),
  supportPhone1: text("support_phone1").notNull().default(""),
  supportPhone2: text("support_phone2").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSiteContentSchema = createInsertSchema(siteContentTable).omit({ id: true, updatedAt: true });
export type InsertSiteContent = z.infer<typeof insertSiteContentSchema>;
export type SiteContent = typeof siteContentTable.$inferSelect;
