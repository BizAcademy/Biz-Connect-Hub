import { Router, type IRouter } from "express";
import { VerifyAdminBody } from "@workspace/api-zod";
import { checkAdminPassword } from "../lib/adminAuth";

const router: IRouter = Router();

// POST /admin/verify
router.post("/admin/verify", async (req, res): Promise<void> => {
  const parsed = VerifyAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const valid = checkAdminPassword(parsed.data.password);
  if (!valid) {
    res.status(401).json({ error: "Mot de passe incorrect" });
    return;
  }

  res.json({ valid: true });
});

export default router;
