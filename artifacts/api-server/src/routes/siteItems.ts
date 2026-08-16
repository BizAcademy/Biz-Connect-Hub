import { Router, type IRouter, type Request, type Response } from "express";
import { asc, eq } from "drizzle-orm";
import {
  db,
  trainingsTable,
  testimonialsTable,
  portfolioItemsTable,
  ambassadorsTable,
  partnersTable,
  paymentMethodsTable,
  servicesTable,
  serviceTestimonialsTable,
  featureItemsTable,
  helpVideosTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import {
  CreateTrainingBody,
  UpdateTrainingBody,
  CreateTestimonialBody,
  UpdateTestimonialBody,
  CreatePortfolioItemBody,
  CreateAmbassadorBody,
  UpdateAmbassadorBody,
  CreatePartnerBody,
  UpdatePartnerBody,
  CreatePaymentMethodBody,
  UpdatePaymentMethodBody,
  CreateServiceBody,
  UpdateServiceBody,
  CreateServiceTestimonialBody,
  UpdateServiceTestimonialBody,
  CreateFeatureItemBody,
  UpdateFeatureItemBody,
  CreateHelpVideoBody,
  UpdateHelpVideoBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseId(req: Request, res: Response): number | null {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid id" });
    return null;
  }
  return id;
}

// ---------- Trainings ----------
router.get("/trainings", async (_req, res) => {
  const rows = await db
    .select()
    .from(trainingsTable)
    .orderBy(asc(trainingsTable.sortOrder), asc(trainingsTable.id));
  res.json(rows);
});

router.post("/trainings", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CreateTrainingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(trainingsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(created);
});

router.put("/trainings/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  const parsed = UpdateTrainingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(trainingsTable)
    .set(parsed.data)
    .where(eq(trainingsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/trainings/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  await db.delete(trainingsTable).where(eq(trainingsTable.id, id));
  res.json({ success: true });
});

// ---------- Testimonials ----------
router.get("/testimonials", async (_req, res) => {
  const rows = await db
    .select()
    .from(testimonialsTable)
    .orderBy(asc(testimonialsTable.sortOrder), asc(testimonialsTable.id));
  res.json(rows);
});

router.post("/testimonials", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CreateTestimonialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(testimonialsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(created);
});

router.put("/testimonials/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  const parsed = UpdateTestimonialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(testimonialsTable)
    .set(parsed.data)
    .where(eq(testimonialsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/testimonials/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  await db.delete(testimonialsTable).where(eq(testimonialsTable.id, id));
  res.json({ success: true });
});

// ---------- Portfolio ----------
router.get("/portfolio", async (_req, res) => {
  const rows = await db
    .select()
    .from(portfolioItemsTable)
    .orderBy(asc(portfolioItemsTable.sortOrder), asc(portfolioItemsTable.id));
  res.json(rows);
});

router.post("/portfolio", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CreatePortfolioItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(portfolioItemsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(created);
});

router.delete("/portfolio/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  await db.delete(portfolioItemsTable).where(eq(portfolioItemsTable.id, id));
  res.json({ success: true });
});

// ---------- Ambassadors ----------
router.get("/ambassadors", async (_req, res) => {
  const rows = await db
    .select()
    .from(ambassadorsTable)
    .orderBy(asc(ambassadorsTable.sortOrder), asc(ambassadorsTable.id));
  res.json(rows);
});

router.post("/ambassadors", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CreateAmbassadorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(ambassadorsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(created);
});

router.put("/ambassadors/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  const parsed = UpdateAmbassadorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(ambassadorsTable)
    .set(parsed.data)
    .where(eq(ambassadorsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/ambassadors/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  await db.delete(ambassadorsTable).where(eq(ambassadorsTable.id, id));
  res.json({ success: true });
});

// ---------- Partners ----------
router.get("/partners", async (_req, res) => {
  const rows = await db
    .select()
    .from(partnersTable)
    .orderBy(asc(partnersTable.sortOrder), asc(partnersTable.id));
  res.json(rows);
});

router.post("/partners", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CreatePartnerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(partnersTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(created);
});

router.put("/partners/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  const parsed = UpdatePartnerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(partnersTable)
    .set(parsed.data)
    .where(eq(partnersTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/partners/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  await db.delete(partnersTable).where(eq(partnersTable.id, id));
  res.json({ success: true });
});

// ---------- Payment methods ----------
router.get("/payment-methods", async (_req, res) => {
  const rows = await db
    .select()
    .from(paymentMethodsTable)
    .orderBy(asc(paymentMethodsTable.sortOrder), asc(paymentMethodsTable.id));
  res.json(rows);
});

router.post("/payment-methods", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CreatePaymentMethodBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(paymentMethodsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(created);
});

router.put("/payment-methods/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  const parsed = UpdatePaymentMethodBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(paymentMethodsTable)
    .set(parsed.data)
    .where(eq(paymentMethodsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/payment-methods/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  await db.delete(paymentMethodsTable).where(eq(paymentMethodsTable.id, id));
  res.json({ success: true });
});


// ---------- Services ----------
router.get("/services", async (_req, res) => {
  const rows = await db
    .select()
    .from(servicesTable)
    .orderBy(asc(servicesTable.sortOrder), asc(servicesTable.id));
  res.json(rows);
});

router.post("/services", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db.insert(servicesTable).values(parsed.data).returning();
  res.status(201).json(created);
});

router.put("/services/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(servicesTable)
    .set(parsed.data)
    .where(eq(servicesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/services/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  await db.delete(servicesTable).where(eq(servicesTable.id, id));
  res.json({ success: true });
});

// ---------- Service testimonials ----------
router.get("/service-testimonials", async (_req, res) => {
  const rows = await db
    .select()
    .from(serviceTestimonialsTable)
    .orderBy(asc(serviceTestimonialsTable.sortOrder), asc(serviceTestimonialsTable.id));
  res.json(rows);
});

router.post("/service-testimonials", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CreateServiceTestimonialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(serviceTestimonialsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(created);
});

router.put("/service-testimonials/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  const parsed = UpdateServiceTestimonialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(serviceTestimonialsTable)
    .set(parsed.data)
    .where(eq(serviceTestimonialsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/service-testimonials/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  await db.delete(serviceTestimonialsTable).where(eq(serviceTestimonialsTable.id, id));
  res.json({ success: true });
});

// ---------- Feature items ----------
router.get("/features", async (_req, res) => {
  const rows = await db
    .select()
    .from(featureItemsTable)
    .orderBy(asc(featureItemsTable.sortOrder), asc(featureItemsTable.id));
  res.json(rows);
});

router.post("/features", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CreateFeatureItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db.insert(featureItemsTable).values(parsed.data).returning();
  res.status(201).json(created);
});

router.put("/features/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  const parsed = UpdateFeatureItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(featureItemsTable)
    .set(parsed.data)
    .where(eq(featureItemsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/features/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  await db.delete(featureItemsTable).where(eq(featureItemsTable.id, id));
  res.json({ success: true });
});

// ---------- Help videos ----------
router.get("/help-videos", async (_req, res) => {
  const rows = await db
    .select()
    .from(helpVideosTable)
    .orderBy(asc(helpVideosTable.sortOrder), asc(helpVideosTable.id));
  res.json(rows);
});

router.post("/help-videos", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CreateHelpVideoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db.insert(helpVideosTable).values(parsed.data).returning();
  res.status(201).json(created);
});

router.put("/help-videos/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  const parsed = UpdateHelpVideoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(helpVideosTable)
    .set(parsed.data)
    .where(eq(helpVideosTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/help-videos/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseId(req, res);
  if (id === null) return;
  await db.delete(helpVideosTable).where(eq(helpVideosTable.id, id));
  res.json({ success: true });
});

export default router;
