import { Readable } from "stream";
import { RequestUploadUrlBody } from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";

import {
  ObjectNotFoundError,
  ObjectStorageService,
} from "../lib/objectStorage";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

// Only images and videos may be uploaded, capped at 50 MB.
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = /^(image|video)\//;

/**
 * POST /storage/uploads/request-url — admin only.
 * Returns a presigned URL; the client then PUTs the file directly.
 */
router.post(
  "/storage/uploads/request-url",
  async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;

    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    if (!ALLOWED_CONTENT_TYPES.test(parsed.data.contentType)) {
      res.status(400).json({ error: "Seules les images et vidéos sont autorisées" });
      return;
    }
    if (parsed.data.size > MAX_UPLOAD_SIZE) {
      res.status(400).json({ error: "Fichier trop volumineux (max 50 Mo)" });
      return;
    }

    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({ uploadURL, objectPath });
    } catch (error) {
      req.log.error({ err: error }, "Error generating upload URL");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

/**
 * GET /storage/objects/* — serve uploaded objects (public read: all uploads
 * here are site assets shown to visitors).
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    // Only serve site assets uploaded through the admin flow (uploads/ prefix),
    // and reject any path traversal.
    if (!/^uploads\/[A-Za-z0-9_-]+$/.test(wildcardPath)) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile =
      await objectStorageService.getObjectEntityFile(objectPath);

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader("Cache-Control", "public, max-age=3600");

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
