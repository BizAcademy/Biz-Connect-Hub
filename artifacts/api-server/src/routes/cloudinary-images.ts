import { Router } from "express";
import { MigrateCloudinaryImageBody } from "@workspace/api-zod";
import { requireAdmin } from "../lib/adminAuth";
import { ImageMigrationError, listCloudinaryImages, migrateCloudinaryImage } from "../lib/cloudinary-images";

const router = Router();
router.get("/admin/cloudinary-images", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try { res.json(await listCloudinaryImages()); }
  catch (error) {
    req.log.error({ err: error }, "Image migration inventory failed");
    res.status(500).json({ error: "Impossible de charger les images à transférer." });
  }
});
router.post("/admin/cloudinary-images", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = MigrateCloudinaryImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Adresse de l'image invalide." });
    return;
  }
  try { res.json(await migrateCloudinaryImage(parsed.data.url)); }
  catch (error) {
    if (error instanceof ImageMigrationError) {
      res.status(error.status).json({ error: error.message });
    } else {
      req.log.error({ err: error }, "Image migration failed");
      res.status(500).json({ error: "Le transfert a échoué. Aucun lien n'a été remplacé." });
    }
  }
});
export default router;
