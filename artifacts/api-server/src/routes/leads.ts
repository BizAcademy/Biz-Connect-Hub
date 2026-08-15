import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import {
  CreateLeadBody,
  ListLeadsHeader,
  ExportLeadsHeader,
  GetLeadsStatsHeader,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { checkAdminPassword as checkAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

// POST /leads — public form submission
router.post("/leads", async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lead] = await db
    .insert(leadsTable)
    .values({
      name: parsed.data.name,
      phone: parsed.data.phone,
      city: parsed.data.city,
    })
    .returning();

  req.log.info({ leadId: lead.id }, "New lead created");

  res.status(201).json({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    city: lead.city,
    createdAt: lead.createdAt.toISOString(),
  });
});

// GET /leads — admin: list all leads
router.get("/leads", async (req, res): Promise<void> => {
  const headerParsed = ListLeadsHeader.safeParse(req.headers);
  if (!headerParsed.success || !checkAdmin(headerParsed.data["x-admin-password"])) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const leads = await db
    .select()
    .from(leadsTable)
    .orderBy(desc(leadsTable.createdAt));

  res.json(
    leads.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      city: l.city,
      createdAt: l.createdAt.toISOString(),
    }))
  );
});

// GET /leads/export — admin: export CSV
router.get("/leads/export", async (req, res): Promise<void> => {
  const headerParsed = ExportLeadsHeader.safeParse(req.headers);
  if (!headerParsed.success || !checkAdmin(headerParsed.data["x-admin-password"])) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const leads = await db
    .select()
    .from(leadsTable)
    .orderBy(desc(leadsTable.createdAt));

  const rows = [
    ["ID", "Nom", "Téléphone", "Ville", "Date d'inscription"],
    ...leads.map((l) => [
      String(l.id),
      l.name,
      l.phone,
      l.city,
      l.createdAt.toISOString(),
    ]),
  ];

  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="leads-${Date.now()}.csv"`);
  res.send(csv);
});

// GET /leads/stats — admin: stats by day
router.get("/leads/stats", async (req, res): Promise<void> => {
  const headerParsed = GetLeadsStatsHeader.safeParse(req.headers);
  if (!headerParsed.success || !checkAdmin(headerParsed.data["x-admin-password"])) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leadsTable);

  const byDay = await db
    .select({
      date: sql<string>`to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(leadsTable)
    .groupBy(sql`to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')`);

  res.json({
    total: totalRow?.count ?? 0,
    byDay: byDay.map((r) => ({ date: r.date, count: r.count })),
  });
});

export default router;
