import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, suggestionsTable } from "@workspace/db";
import { CreateSuggestionBody, ListSuggestionsHeader } from "@workspace/api-zod";
import { checkAdminPassword } from "../lib/adminAuth";

const router: IRouter = Router();

router.post("/suggestions", async (req, res): Promise<void> => {
  const parsed = CreateSuggestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [suggestion] = await db.insert(suggestionsTable).values(parsed.data).returning();
  req.log.info({ suggestionId: suggestion.id }, "New suggestion created");
  res.status(201).json({ ...suggestion, createdAt: suggestion.createdAt.toISOString() });
});

router.get("/suggestions", async (req, res): Promise<void> => {
  const header = ListSuggestionsHeader.safeParse(req.headers);
  if (!header.success || !checkAdminPassword(header.data["x-admin-password"])) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const suggestions = await db.select().from(suggestionsTable).orderBy(desc(suggestionsTable.createdAt));
  res.json(suggestions.map((suggestion) => ({
    ...suggestion,
    createdAt: suggestion.createdAt.toISOString(),
  })));
});

export default router;