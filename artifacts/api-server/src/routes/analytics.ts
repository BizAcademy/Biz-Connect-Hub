import { Router, type IRouter } from "express";
import { and, desc, gte, lte, sql } from "drizzle-orm";
import { db, visitorEventsTable } from "@workspace/db";
import { CreateAnalyticsEventBody } from "@workspace/api-zod";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();
const MAX_RANGE_DAYS = 366;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_EVENTS = 120;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function getCountry(headers: Record<string, string | string[] | undefined>): string {
  const value = headers["cf-ipcountry"] ?? headers["x-vercel-ip-country"] ?? headers["x-country-code"];
  const country = Array.isArray(value) ? value[0] : value;
  return country && /^[A-Za-z]{2,64}$/.test(country) ? country.toUpperCase() : "Inconnu";
}

function isRateLimited(visitorId: string, sessionId: string): boolean {
  const key = `${visitorId}:${sessionId}`;
  const now = Date.now();
  const current = rateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX_EVENTS;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// POST /analytics/events — intentionally does not read or persist request IPs.
router.post("/analytics/events", async (req, res): Promise<void> => {
  const parsed = CreateAnalyticsEventBody.safeParse(req.body);
  if (!parsed.success || !Number.isInteger(parsed.data?.durationSeconds)) {
    res.status(400).json({ error: "Invalid analytics event" });
    return;
  }

  if (isRateLimited(parsed.data.visitorId, parsed.data.sessionId)) {
    res.status(429).json({ error: "Too many analytics events" });
    return;
  }

  await db.insert(visitorEventsTable).values({
    visitorId: parsed.data.visitorId,
    sessionId: parsed.data.sessionId,
    eventType: parsed.data.eventType,
    eventName: parsed.data.eventName,
    path: parsed.data.path,
    durationSeconds: parsed.data.durationSeconds,
    metadata: parsed.data.metadata,
    country: getCountry(req.headers),
  });

  res.status(201).json({ accepted: true });
});

// GET /analytics/dashboard — aggregated, bounded admin reporting.
router.get("/analytics/dashboard", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const granularity = req.query.granularity ?? "day";
  if (typeof granularity !== "string" || !["day", "week", "month", "year"].includes(granularity)) {
    res.status(400).json({ error: "granularity must be day, week, month, or year" });
    return;
  }

  const to = req.query.to === undefined ? new Date() : parseDate(req.query.to);
  const defaultFrom = new Date((to ?? new Date()).getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = req.query.from === undefined ? defaultFrom : parseDate(req.query.from);
  if (!from || !to || from > to || to.getTime() - from.getTime() > MAX_RANGE_DAYS * 24 * 60 * 60 * 1000) {
    res.status(400).json({ error: `from and to must define a range of at most ${MAX_RANGE_DAYS} days` });
    return;
  }

  const range = and(gte(visitorEventsTable.createdAt, from), lte(visitorEventsTable.createdAt, to));
  // granularity is strictly allowlisted above; date_trunc expects a text literal.
  const period = sql<string>`to_char(date_trunc(${sql.raw(`'${granularity}'`)}, ${visitorEventsTable.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

  const [summaryRows, timeline, countries, topPages, ctaClicks, recentVisitors] = await Promise.all([
    db
      .select({
        events: sql<number>`count(*)::int`,
        visitors: sql<number>`count(distinct ${visitorEventsTable.visitorId})::int`,
        sessions: sql<number>`count(distinct ${visitorEventsTable.sessionId})::int`,
        pageViews: sql<number>`count(*) filter (where ${visitorEventsTable.eventType} = 'page_view')::int`,
        ctaClicks: sql<number>`count(*) filter (where ${visitorEventsTable.eventType} = 'cta_click')::int`,
        averageDurationSeconds: sql<number>`coalesce(avg(${visitorEventsTable.durationSeconds}) filter (where ${visitorEventsTable.eventType} = 'page_leave'), 0)::float`,
      })
      .from(visitorEventsTable)
      .where(range),
    db
      .select({
        period,
        country: visitorEventsTable.country,
        events: sql<number>`count(*)::int`,
        visitors: sql<number>`count(distinct ${visitorEventsTable.visitorId})::int`,
        pageViews: sql<number>`count(*) filter (where ${visitorEventsTable.eventType} = 'page_view')::int`,
        ctaClicks: sql<number>`count(*) filter (where ${visitorEventsTable.eventType} = 'cta_click')::int`,
        averageDurationSeconds: sql<number>`coalesce(avg(${visitorEventsTable.durationSeconds}) filter (where ${visitorEventsTable.eventType} = 'page_leave'), 0)::float`,
      })
      .from(visitorEventsTable)
      .where(range)
      .groupBy(period, visitorEventsTable.country)
      .orderBy(period, visitorEventsTable.country)
      .limit(2_000),
    db
      .select({
        country: visitorEventsTable.country,
        events: sql<number>`count(*)::int`,
        visitors: sql<number>`count(distinct ${visitorEventsTable.visitorId})::int`,
        pageViews: sql<number>`count(*) filter (where ${visitorEventsTable.eventType} = 'page_view')::int`,
        ctaClicks: sql<number>`count(*) filter (where ${visitorEventsTable.eventType} = 'cta_click')::int`,
        averageDurationSeconds: sql<number>`coalesce(avg(${visitorEventsTable.durationSeconds}) filter (where ${visitorEventsTable.eventType} = 'page_leave'), 0)::float`,
      })
      .from(visitorEventsTable)
      .where(range)
      .groupBy(visitorEventsTable.country)
      .orderBy(desc(sql`count(*)`))
      .limit(100),
    db
      .select({
        path: visitorEventsTable.path,
        views: sql<number>`count(*)::int`,
        visitors: sql<number>`count(distinct ${visitorEventsTable.visitorId})::int`,
      })
      .from(visitorEventsTable)
      .where(and(range, sql`${visitorEventsTable.eventType} = 'page_view'`))
      .groupBy(visitorEventsTable.path)
      .orderBy(desc(sql`count(*)`))
      .limit(100),
    db
      .select({
        eventName: visitorEventsTable.eventName,
        country: visitorEventsTable.country,
        clicks: sql<number>`count(*)::int`,
      })
      .from(visitorEventsTable)
      .where(and(range, sql`${visitorEventsTable.eventType} = 'cta_click'`))
      .groupBy(visitorEventsTable.eventName, visitorEventsTable.country)
      .orderBy(desc(sql`count(*)`))
      .limit(100),
    db
      .select({
        visitorId: visitorEventsTable.visitorId,
        sessionId: visitorEventsTable.sessionId,
        country: visitorEventsTable.country,
        path: sql<string>`(array_agg(${visitorEventsTable.path} order by ${visitorEventsTable.createdAt} desc))[1]`,
        eventType: sql<string>`(array_agg(${visitorEventsTable.eventType} order by ${visitorEventsTable.createdAt} desc))[1]`,
        durationSeconds: sql<number>`(array_agg(${visitorEventsTable.durationSeconds} order by ${visitorEventsTable.createdAt} desc))[1]`,
        createdAt: sql<Date>`max(${visitorEventsTable.createdAt})`,
      })
      .from(visitorEventsTable)
      .where(and(
        range,
        sql`${visitorEventsTable.eventType} in ('page_view', 'page_leave')`,
      ))
      .groupBy(
        visitorEventsTable.visitorId,
        visitorEventsTable.sessionId,
        visitorEventsTable.country,
      )
      .orderBy(desc(sql`max(${visitorEventsTable.createdAt})`))
      .limit(100),
  ]);

  const summary = summaryRows[0] ?? {
    events: 0, visitors: 0, sessions: 0, pageViews: 0, ctaClicks: 0, averageDurationSeconds: 0,
  };
  res.json({
    summary,
    timeline,
    countries,
    topPages,
    ctaClicks,
    recentVisitors: recentVisitors.map((visitor) => ({
      ...visitor,
      createdAt: visitor.createdAt instanceof Date
        ? visitor.createdAt.toISOString()
        : new Date(visitor.createdAt).toISOString(),
    })),
  });
});

export default router;