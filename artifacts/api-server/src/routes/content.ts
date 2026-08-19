import { Router, type IRouter } from "express";
import { db, siteContentTable } from "@workspace/db";
import { UpdateContentHeader, UpdateContentBody } from "@workspace/api-zod";
import { checkAdminPassword as checkAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

function formatContent(c: typeof siteContentTable.$inferSelect) {
  return {
    id: c.id,
    heroTitle: c.heroTitle,
    heroSubtitle: c.heroSubtitle,
    heroCtaText: c.heroCtaText,
    memberCount: c.memberCount,
    memberCountLabel: c.memberCountLabel,
    geoAvailability: c.geoAvailability,
    promoTitle: c.promoTitle,
    promoDescription: c.promoDescription,
    promoVideoUrl: c.promoVideoUrl,
    promoPosterUrl: c.promoPosterUrl,
    promoCtaText: c.promoCtaText,
    videoUrl: c.videoUrl,
    offerPrice: c.offerPrice,
    offerOriginalPrice: c.offerOriginalPrice,
    offerLabel: c.offerLabel,
    level1Name: c.level1Name,
    level1Amount: c.level1Amount,
    level2Name: c.level2Name,
    level2Amount: c.level2Amount,
    level3Name: c.level3Name,
    level3Amount: c.level3Amount,
    whatsappNumber: c.whatsappNumber,
    heroImageUrl: c.heroImageUrl,
    signupUrl: c.signupUrl,
    communityImageUrl: c.communityImageUrl,
    countriesIconUrl: c.countriesIconUrl,
    gainsPosterUrl: c.gainsPosterUrl,
    telegramLink: c.telegramLink,
    supportPhone1: c.supportPhone1,
    supportPhone2: c.supportPhone2,
    updatedAt: c.updatedAt.toISOString(),
  };
}

async function ensureContent() {
  const [existing] = await db.select().from(siteContentTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(siteContentTable).values({}).returning();
  return created;
}

// GET /content
router.get("/content", async (_req, res): Promise<void> => {
  const content = await ensureContent();
  res.json(formatContent(content));
});

// PUT /content — admin only
router.put("/content", async (req, res): Promise<void> => {
  const headerParsed = UpdateContentHeader.safeParse(req.headers);
  if (!headerParsed.success || !checkAdmin(headerParsed.data["x-admin-password"])) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await ensureContent();

  const [updated] = await db
    .update(siteContentTable)
    .set({ ...parsed.data })
    .returning();

  if (!updated) {
    // Fallback: insert then return
    const [created] = await db.insert(siteContentTable).values({}).returning();
    res.json(formatContent(created));
    return;
  }

  res.json(formatContent(updated));
});

export default router;
