import { createHash } from "crypto";
import { CreateMediaBody } from "@workspace/api-zod";
import { db, mediaTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

const CLOUDINARY_FOLDER = "biz-connect";
const BACKGROUND_REMOVAL = "cloudinary_ai";
const MAX_BYTES = 50 * 1024 * 1024; // 50 Mo, aligné sur l'upload object-storage

function getCloudinaryConfig(): {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
} | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

/** Cloudinary signature: sha1 of sorted params + api secret. */
function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

type CloudinaryResource = {
  public_id: string;
  secure_url: string;
  resource_type: string;
  bytes: number;
  info?: {
    background_removal?: {
      cloudinary_ai?: { status?: string };
    };
  };
};

function backgroundRemovalStatus(resource: CloudinaryResource): string | null {
  return resource.info?.background_removal?.cloudinary_ai?.status ?? null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch asset metadata from the Cloudinary Admin API (server-side truth). */
async function fetchCloudinaryResource(
  config: { cloudName: string; apiKey: string; apiSecret: string },
  publicId: string,
): Promise<CloudinaryResource | null> {
  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64");
  for (const resourceType of ["image", "video"] as const) {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/${resourceType}/upload/${encodeURIComponent(publicId)}`,
      { headers: { Authorization: `Basic ${auth}` } },
    );
    if (res.ok) {
      const data = (await res.json()) as Omit<CloudinaryResource, "resource_type">;
      return { ...data, resource_type: resourceType };
    }
  }
  return null;
}

/** Signed destroy call. Returns Cloudinary's `result` string, or null on network/HTTP failure. */
async function destroyCloudinaryAsset(
  config: { cloudName: string; apiKey: string; apiSecret: string },
  publicId: string,
  resourceType: string,
): Promise<string | null> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ public_id: publicId, timestamp }, config.apiSecret);
  const form = new FormData();
  form.append("public_id", publicId);
  form.append("timestamp", String(timestamp));
  form.append("api_key", config.apiKey);
  form.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/destroy`,
    { method: "POST", body: form },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: string };
  return data.result ?? null;
}

/**
 * POST /media/uploads/signature — admin only.
 * Returns signed params; the client uploads directly to Cloudinary with them.
 */
router.post("/media/uploads/signature", (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const config = getCloudinaryConfig();
  if (!config) {
    res.status(500).json({ error: "Cloudinary n'est pas configuré" });
    return;
  }

  const removeBackground = Boolean(
    (req.body as { removeBackground?: unknown } | undefined)?.removeBackground,
  );

  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = {
    folder: CLOUDINARY_FOLDER,
    timestamp,
  };
  if (removeBackground) params.background_removal = BACKGROUND_REMOVAL;
  const signature = signParams(params, config.apiSecret);

  res.json({
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    timestamp,
    signature,
    folder: CLOUDINARY_FOLDER,
    ...(removeBackground ? { backgroundRemoval: BACKGROUND_REMOVAL } : {}),
  });
});

/** GET /media — list uploaded media (admin only). */
router.get("/media", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const rows = await db
      .select()
      .from(mediaTable)
      .orderBy(desc(mediaTable.createdAt));
    res.json(
      rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error listing media");
    res.status(500).json({ error: "Failed to list media" });
  }
});

/**
 * POST /media — register an uploaded Cloudinary asset (admin only).
 * The asset is verified server-side against the Cloudinary Admin API:
 * it must exist in our cloud, inside the biz-connect folder, be an
 * image or video, and stay under the size limit. Verified metadata
 * (URL, type) is persisted — client-provided values are not trusted.
 */
router.post("/media", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const config = getCloudinaryConfig();
  if (!config) {
    res.status(500).json({ error: "Cloudinary n'est pas configuré" });
    return;
  }

  const parsed = CreateMediaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  const { publicId } = parsed.data;
  if (!publicId.startsWith(`${CLOUDINARY_FOLDER}/`)) {
    res.status(400).json({ error: "publicId hors du dossier autorisé" });
    return;
  }

  try {
    let resource = await fetchCloudinaryResource(config, publicId);
    if (!resource) {
      res.status(400).json({ error: "Média introuvable sur Cloudinary" });
      return;
    }

    // Si une suppression d'arrière-plan est en cours, attendre qu'elle soit
    // terminée pour enregistrer l'URL finale (PNG transparent).
    // Quand le client a demandé la suppression, un statut absent est traité
    // comme « en attente » (l'Admin API peut mettre du temps à l'exposer).
    const removalRequested = parsed.data.removeBackground === true;
    let status = backgroundRemovalStatus(resource);
    if (removalRequested && status === null) status = "pending";
    if (status === "pending") {
      for (let i = 0; i < 15 && status === "pending"; i++) {
        await sleep(2000);
        resource = await fetchCloudinaryResource(config, publicId);
        if (!resource) break;
        status = backgroundRemovalStatus(resource);
        if (removalRequested && status === null) status = "pending";
      }
    }
    if (!resource) {
      res.status(400).json({ error: "Média introuvable sur Cloudinary" });
      return;
    }
    if (status === "pending") {
      res.status(504).json({
        error: "La suppression de l'arrière-plan prend trop de temps, réessayez",
      });
      return;
    }
    if (status && status !== "complete") {
      await destroyCloudinaryAsset(config, publicId, resource.resource_type);
      res.status(422).json({
        error: "Échec de la suppression de l'arrière-plan, réessayez",
      });
      return;
    }
    if (resource.bytes > MAX_BYTES) {
      // Oversized upload slipped through the client — clean it up remotely.
      await destroyCloudinaryAsset(config, publicId, resource.resource_type);
      res.status(400).json({ error: "Fichier trop volumineux (max 50 Mo)" });
      return;
    }

    const [row] = await db
      .insert(mediaTable)
      .values({
        name: parsed.data.name ?? "",
        url: resource.secure_url,
        publicId: resource.public_id,
        resourceType: resource.resource_type,
      })
      .returning();
    res
      .status(201)
      .json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (error) {
    req.log.error({ err: error }, "Error creating media");
    res.status(500).json({ error: "Failed to create media" });
  }
});

/**
 * DELETE /media/:id — destroy on Cloudinary, then remove from DB (admin only).
 * The DB row is only removed after Cloudinary confirms the destroy
 * ("ok" or "not found"); otherwise the request fails so it can be retried.
 */
router.delete("/media/:id", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const config = getCloudinaryConfig();
  if (!config) {
    res.status(500).json({ error: "Cloudinary n'est pas configuré" });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(mediaTable)
      .where(eq(mediaTable.id, id));
    if (!row) {
      res.status(404).json({ error: "Media not found" });
      return;
    }

    const result = await destroyCloudinaryAsset(config, row.publicId, row.resourceType);
    if (result !== "ok" && result !== "not found") {
      req.log.error(
        { result, publicId: row.publicId },
        "Cloudinary destroy failed",
      );
      res.status(502).json({ error: "Échec de la suppression sur Cloudinary" });
      return;
    }

    await db.delete(mediaTable).where(eq(mediaTable.id, id));
    res.json({ success: true });
  } catch (error) {
    req.log.error({ err: error }, "Error deleting media");
    res.status(500).json({ error: "Failed to delete media" });
  }
});

export default router;
