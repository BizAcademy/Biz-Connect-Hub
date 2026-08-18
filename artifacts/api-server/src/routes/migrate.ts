/**
 * POST /admin/migrate-cloudinary-videos — admin only.
 *
 * Migre chaque vidéo Cloudinary (publicId préfixé "biz-connect/", resourceType="video")
 * vers Supabase Storage :
 *   1. Téléchargement depuis Cloudinary (secure_url)
 *   2. Upload vers le bucket Supabase "videos"
 *   3. Mise à jour de la ligne media (url + publicId)
 *   4. Mise à jour des références dans site_content, testimonials,
 *      service_testimonials et help_videos
 *   5. Suppression de l'asset Cloudinary
 *
 * Réponse SSE : chaque ligne est un JSON `{ type, ... }`.
 * L'admin peut appeler l'endpoint depuis le panneau d'administration et
 * suivre la progression en temps réel.
 */

import { createHash } from "crypto";
import { db, mediaTable } from "@workspace/db";
import {
  siteContentTable,
  testimonialsTable,
  serviceTestimonialsTable,
  helpVideosTable,
} from "@workspace/db";
import { eq, and, like } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

const CLOUDINARY_FOLDER = "biz-connect";
const SUPABASE_BUCKET = "videos";

// ─── helpers Cloudinary ───────────────────────────────────────────────────────

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

function signParams(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

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

// ─── helpers Supabase ─────────────────────────────────────────────────────────

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

function supabaseHeaders(serviceKey: string): Record<string, string> {
  return { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey };
}

async function ensureVideoBucket(config: { url: string; serviceKey: string }) {
  const headers = { ...supabaseHeaders(config.serviceKey), "Content-Type": "application/json" };
  const res = await fetch(`${config.url}/storage/v1/bucket/${SUPABASE_BUCKET}`, { headers });
  if (res.ok) {
    const bucket = (await res.json()) as { public?: boolean };
    if (!bucket.public) {
      await fetch(`${config.url}/storage/v1/bucket/${SUPABASE_BUCKET}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ public: true }),
      });
    }
    return;
  }
  const create = await fetch(`${config.url}/storage/v1/bucket`, {
    method: "POST",
    headers,
    body: JSON.stringify({ id: SUPABASE_BUCKET, name: SUPABASE_BUCKET, public: true }),
  });
  if (!create.ok) {
    const text = await create.text();
    if (!text.includes("already exists")) {
      throw new Error(`Impossible de créer le bucket Supabase : ${text}`);
    }
  }
}

// ─── mise à jour des références d'URL dans le contenu ────────────────────────

async function updateContentReferences(oldUrl: string, newUrl: string): Promise<number> {
  let updated = 0;

  // site_content.video_url
  const [sc] = await db
    .select({ id: siteContentTable.id, videoUrl: siteContentTable.videoUrl })
    .from(siteContentTable);
  if (sc && sc.videoUrl === oldUrl) {
    await db
      .update(siteContentTable)
      .set({ videoUrl: newUrl })
      .where(eq(siteContentTable.id, sc.id));
    updated++;
  }

  // testimonials.media_url (vidéos uniquement)
  const testimonialRows = await db
    .select({ id: testimonialsTable.id })
    .from(testimonialsTable)
    .where(
      and(
        eq(testimonialsTable.mediaUrl, oldUrl),
        eq(testimonialsTable.mediaType, "video"),
      ),
    );
  for (const row of testimonialRows) {
    await db
      .update(testimonialsTable)
      .set({ mediaUrl: newUrl })
      .where(eq(testimonialsTable.id, row.id));
    updated++;
  }

  // service_testimonials.media_url (vidéos uniquement)
  const stRows = await db
    .select({ id: serviceTestimonialsTable.id })
    .from(serviceTestimonialsTable)
    .where(
      and(
        eq(serviceTestimonialsTable.mediaUrl, oldUrl),
        eq(serviceTestimonialsTable.mediaType, "video"),
      ),
    );
  for (const row of stRows) {
    await db
      .update(serviceTestimonialsTable)
      .set({ mediaUrl: newUrl })
      .where(eq(serviceTestimonialsTable.id, row.id));
    updated++;
  }

  // help_videos.video_url
  const hvRows = await db
    .select({ id: helpVideosTable.id })
    .from(helpVideosTable)
    .where(eq(helpVideosTable.videoUrl, oldUrl));
  for (const row of hvRows) {
    await db
      .update(helpVideosTable)
      .set({ videoUrl: newUrl })
      .where(eq(helpVideosTable.id, row.id));
    updated++;
  }

  return updated;
}

// ─── endpoint de migration ────────────────────────────────────────────────────

router.post("/admin/migrate-cloudinary-videos", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const cloudCfg = getCloudinaryConfig();
  if (!cloudCfg) {
    res.status(500).json({ error: "Cloudinary non configuré" });
    return;
  }
  const supaCfg = getSupabaseConfig();
  if (!supaCfg) {
    res.status(500).json({ error: "Supabase non configuré" });
    return;
  }

  // SSE pour suivre la progression en temps réel
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await ensureVideoBucket(supaCfg);

    // Récupérer toutes les vidéos Cloudinary (publicId préfixé "biz-connect/")
    const cloudinaryVideos = await db
      .select()
      .from(mediaTable)
      .where(
        and(
          eq(mediaTable.resourceType, "video"),
          like(mediaTable.publicId, `${CLOUDINARY_FOLDER}/%`),
        ),
      );

    send({ type: "start", total: cloudinaryVideos.length });

    if (cloudinaryVideos.length === 0) {
      send({ type: "done", migrated: 0, skipped: 0, errors: 0 });
      res.end();
      return;
    }

    let migrated = 0;
    let errors = 0;

    for (const media of cloudinaryVideos) {
      send({ type: "processing", id: media.id, name: media.name, publicId: media.publicId });

      try {
        // 1. Télécharger depuis Cloudinary
        send({ type: "step", id: media.id, step: "download" });
        const dlRes = await fetch(media.url);
        if (!dlRes.ok) {
          throw new Error(`Téléchargement Cloudinary échoué (HTTP ${dlRes.status})`);
        }
        const contentType = dlRes.headers.get("content-type") ?? "video/mp4";
        const videoBuffer = Buffer.from(await dlRes.arrayBuffer());

        // 2. Construire le chemin Supabase (basé sur le nom du fichier Cloudinary)
        const cloudFilename = media.publicId.split("/").pop() ?? media.id.toString();
        const ext = contentType.split("/")[1]?.replace("quicktime", "mov") ?? "mp4";
        const objectPath = `migrated-${Date.now()}-${cloudFilename}.${ext}`;

        // 3. Upload vers Supabase Storage
        send({ type: "step", id: media.id, step: "upload", bytes: videoBuffer.length });
        const uploadRes = await fetch(
          `${supaCfg.url}/storage/v1/object/${SUPABASE_BUCKET}/${objectPath}`,
          {
            method: "POST",
            headers: {
              ...supabaseHeaders(supaCfg.serviceKey),
              "Content-Type": contentType,
            },
            body: videoBuffer,
          },
        );
        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(`Upload Supabase échoué (HTTP ${uploadRes.status}): ${errText}`);
        }

        const newPublicId = `${SUPABASE_BUCKET}/${objectPath}`;
        const newUrl = `${supaCfg.url}/storage/v1/object/public/${SUPABASE_BUCKET}/${objectPath}`;
        const oldUrl = media.url;

        // 4. Mettre à jour la ligne media
        send({ type: "step", id: media.id, step: "update_db" });
        await db
          .update(mediaTable)
          .set({ url: newUrl, publicId: newPublicId })
          .where(eq(mediaTable.id, media.id));

        // 5. Mettre à jour les références d'URL dans le contenu
        const refsUpdated = await updateContentReferences(oldUrl, newUrl);
        if (refsUpdated > 0) {
          send({ type: "refs_updated", id: media.id, count: refsUpdated });
        }

        // 6. Supprimer l'asset Cloudinary
        send({ type: "step", id: media.id, step: "delete_cloudinary" });
        const destroyResult = await destroyCloudinaryAsset(cloudCfg, media.publicId, media.resourceType);
        if (destroyResult !== "ok" && destroyResult !== "not found") {
          // Non-bloquant : la migration DB est déjà faite, on log mais on ne fail pas
          send({
            type: "warning",
            id: media.id,
            message: `Suppression Cloudinary incomplète (result: ${destroyResult}) — l'asset restera sur Cloudinary mais la migration est faite.`,
          });
        }

        send({
          type: "migrated",
          id: media.id,
          name: media.name,
          newUrl,
          newPublicId,
          refsUpdated,
        });
        migrated++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({ type: "error", id: media.id, name: media.name, message });
        errors++;
      }
    }

    send({ type: "done", migrated, skipped: 0, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    send({ type: "fatal", message });
  }

  res.end();
});

/**
 * GET /admin/migrate-cloudinary-videos/status — aperçu rapide.
 * Renvoie la liste des vidéos encore sur Cloudinary (non migrées).
 */
router.get("/admin/migrate-cloudinary-videos/status", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const rows = await db
      .select({ id: mediaTable.id, name: mediaTable.name, publicId: mediaTable.publicId, url: mediaTable.url })
      .from(mediaTable)
      .where(
        and(
          eq(mediaTable.resourceType, "video"),
          like(mediaTable.publicId, `${CLOUDINARY_FOLDER}/%`),
        ),
      );
    res.json({ pending: rows.length, videos: rows });
  } catch (err) {
    res.status(500).json({ error: "Erreur DB" });
  }
});

export default router;
