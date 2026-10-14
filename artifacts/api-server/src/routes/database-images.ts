import { createHash, randomUUID } from "node:crypto";
import { Router, raw, type ErrorRequestHandler } from "express";
import { and, eq, like } from "drizzle-orm";
import { db, mediaTable, type Media } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import { imageVariant, IMAGE_WIDTHS } from "../lib/image-variants";
import {
  DATABASE_IMAGE_PREFIX, MAX_IMAGE_BYTES, databaseImageUrl,
  decodeDatabaseImage, encodeDatabaseImage, imageMimeType,
} from "../lib/database-images";

type ImageStore = {
  insert(values: { name: string; url: string; publicId: string; resourceType: string }): Promise<Media>;
  find(id: number): Promise<{ url: string } | undefined>;
};

const postgresStore: ImageStore = {
  async insert(values) {
    const [row] = await db.insert(mediaTable).values(values).returning();
    return row;
  },
  async find(id) {
    const [row] = await db.select({ url: mediaTable.url }).from(mediaTable).where(and(
      eq(mediaTable.id, id), eq(mediaTable.resourceType, "image"),
      like(mediaTable.publicId, `${DATABASE_IMAGE_PREFIX}%`),
    ));
    return row;
  },
};

/** Image bytes live in the existing media table; no production schema migration. */
export function createDatabaseImagesRouter(store: ImageStore = postgresStore, authorize = requireAdmin) {
  const router = Router();
  router.post("/media/uploads/database",
    (req, res, next) => { if (authorize(req, res)) next(); },
    raw({ type: "application/octet-stream", limit: MAX_IMAGE_BYTES }),
    async (req, res) => {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        res.status(400).json({ error: "Envoyez un fichier image non vide." });
        return;
      }
      const mimeType = imageMimeType(req.body);
      if (!mimeType) {
        res.status(415).json({ error: "Format non pris en charge. Utilisez PNG, JPEG, WebP, GIF, AVIF ou ICO (10 Mo maximum)." });
        return;
      }
      let name: string;
      try {
        name = decodeURIComponent(req.get("x-file-name") ?? "Image").replace(/[\u0000-\u001f]/g, "").trim();
      } catch {
        res.status(400).json({ error: "Nom de fichier invalide." });
        return;
      }
      if (!name || name.length > 255) {
        res.status(400).json({ error: "Le nom de fichier doit contenir entre 1 et 255 caractères." });
        return;
      }
      try {
        const row = await store.insert({
          name,
          publicId: `${DATABASE_IMAGE_PREFIX}${randomUUID()}`,
          resourceType: "image",
          url: encodeDatabaseImage(req.body, mimeType),
        });
        res.status(201).json({ ...row, url: databaseImageUrl(row.id), createdAt: row.createdAt.toISOString() });
      } catch (error) {
        req.log?.error({ err: error }, "Database image upload failed");
        res.status(500).json({ error: "Impossible d'enregistrer l'image dans la base de données." });
      }
    },
  );
  const uploadError: ErrorRequestHandler = (error, _req, res, next) => {
    if (error.type === "entity.too.large") {
      res.status(413).json({ error: "L'image dépasse la limite de 10 Mo." });
    } else next(error);
  };
  router.use("/media/uploads/database", uploadError);

  router.get(["/media/:id/content", "/media/:id/content/:width"], async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      res.status(400).json({ error: "Identifiant invalide." });
      return;
    }
    try {
      const row = await store.find(id);
      let image = row && decodeDatabaseImage(row.url);
      if (!image) {
        res.set("Cache-Control", "no-store").status(404).json({ error: "Image introuvable." });
        return;
      }
      if (req.params.width !== undefined) {
        const width = Number(req.params.width);
        if (!IMAGE_WIDTHS.includes(width)) {
          res.status(400).json({ error: "Largeur d'image non prise en charge." }); return;
        }
        try { image = await imageVariant(image, width); }
        catch (error) {
          // A display derivative must never hide a valid original image.
          req.log?.warn({ err: error }, "Using original image: display optimization unavailable");
        }
      }
      res.set({
        "Content-Type": image.mimeType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
        "ETag": `"${createHash("sha256").update(image.bytes).digest("hex")}"`,
      });
      res.send(image.bytes);
    } catch (error) {
      req.log?.error({ err: error }, "Database image read failed");
      res.status(500).json({ error: "Impossible de charger l'image." });
    }
  });
  return router;
}

export default createDatabaseImagesRouter();
