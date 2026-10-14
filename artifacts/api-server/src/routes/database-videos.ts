import { Router } from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { and, eq, like } from "drizzle-orm";
import { db, mediaTable, pool } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import { MAX_VIDEO_BYTES, VIDEO_CHUNK_BYTES, VIDEO_PREFIX, readVideoMetadata, storeDatabaseVideo, videoRange } from "../lib/database-videos";

const router = Router();
let activeUploads = 0;

router.post("/media/uploads/database-video", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (!req.is("application/octet-stream")) {
    res.status(415).json({ error: "Envoyez le fichier vidéo original." }); return;
  }
  if (Number(req.get("content-length")) > MAX_VIDEO_BYTES) {
    res.status(413).json({ error: "La vidéo dépasse la limite de 200 Mo." }); return;
  }
  if (activeUploads >= 2) {
    res.status(429).json({ error: "Deux vidéos sont déjà en cours d'envoi. Réessayez dans un instant." }); return;
  }
  let name: string;
  try { name = decodeURIComponent(req.get("x-file-name") ?? "Vidéo").replace(/[\u0000-\u001f]/g, "").trim(); }
  catch { res.status(400).json({ error: "Nom de fichier invalide." }); return; }
  if (!name || name.length > 255) { res.status(400).json({ error: "Nom de fichier invalide (255 caractères maximum)." }); return; }
  activeUploads++;
  try { res.status(201).json(await storeDatabaseVideo(req, name)); }
  catch (error) {
    const failure = error as Error & { status?: number };
    if (failure.status) res.status(failure.status).json({ error: failure.message });
    else {
      req.log.error({ err: error }, "Database video upload failed");
      if (!res.destroyed) res.status(500).json({ error: "Impossible d'enregistrer la vidéo. Aucun fichier incomplet n'est conservé." });
    }
  } finally { activeUploads--; }
});

router.get("/media/:id/video", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) { res.status(400).end(); return; }
  try {
    const [row] = await db.select({ url: mediaTable.url }).from(mediaTable).where(and(
      eq(mediaTable.id, id), eq(mediaTable.resourceType, "video"), like(mediaTable.publicId, `${VIDEO_PREFIX}%`),
    ));
    const metadata = row && readVideoMetadata(row.url);
    if (!metadata) { res.set("Cache-Control", "no-store").status(404).end(); return; }
    const etag = `"${metadata.sha256}"`;
    const rangeHeader = req.method === "HEAD" ? undefined :
      (req.get("if-range") && req.get("if-range") !== etag ? undefined : req.get("range"));
    const range = videoRange(rangeHeader, metadata.bytes);
    res.set({ "Accept-Ranges": "bytes", "Content-Type": metadata.mimeType, "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable", "ETag": etag });
    if (!range) { res.status(416).set("Content-Range", `bytes */${metadata.bytes}`).end(); return; }
    if (!rangeHeader && req.get("if-none-match") === etag) { res.status(304).end(); return; }
    res.status(rangeHeader ? 206 : 200).set("Content-Length", String(range.end - range.start + 1));
    if (rangeHeader) res.set("Content-Range", `bytes ${range.start}-${range.end}/${metadata.bytes}`);
    if (req.method === "HEAD") { res.end(); return; }
    const chunks = async function* () {
      for (let position = range.start; position <= range.end && !res.destroyed; position += VIDEO_CHUNK_BYTES) {
        const length = Math.min(VIDEO_CHUNK_BYTES, range.end - position + 1);
        const result = await pool.query<{ bytes: Buffer }>("select lo_get($1::oid,$2::bigint,$3::integer) as bytes", [metadata.oid, position, length]);
        const bytes = result.rows[0]?.bytes;
        if (!bytes || bytes.length !== length) throw new Error("Incomplete database video");
        yield bytes;
      }
    };
    await pipeline(Readable.from(chunks()), res);
  } catch (error) {
    if (!res.destroyed) {
      req.log.error({ err: error }, "Database video streaming failed");
      if (!res.headersSent) res.status(500).end(); else res.destroy();
    }
  }
});
export default router;
