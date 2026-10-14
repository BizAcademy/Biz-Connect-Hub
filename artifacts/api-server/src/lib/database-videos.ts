import { createHash } from "node:crypto";
import { pool } from "@workspace/db";

export const VIDEO_PREFIX = "database-video:";
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
export const VIDEO_CHUNK_BYTES = 1024 * 1024;
export type VideoMetadata = { oid: number; bytes: number; mimeType: string; sha256: string };

export function videoMimeType(bytes: Buffer): string | null {
  if (bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp" &&
    /^(isom|iso[2-9]|mp4[12]|avc1|dash|MSNV|M4V )$/.test(bytes.toString("ascii", 8, 12))) return "video/mp4";
  if (bytes.subarray(0, 4).equals(Buffer.from("1a45dfa3", "hex")) && bytes.subarray(0, 4096).includes(Buffer.from("webm"))) return "video/webm";
  return null;
}

export function readVideoMetadata(value: string): VideoMetadata | null {
  try {
    const data = JSON.parse(value) as VideoMetadata;
    return Number.isInteger(data.oid) && data.oid > 0 && data.oid <= 0xffffffff &&
      Number.isSafeInteger(data.bytes) && data.bytes > 0 && data.bytes <= MAX_VIDEO_BYTES &&
      ["video/mp4", "video/webm"].includes(data.mimeType) && /^[a-f0-9]{64}$/.test(data.sha256) ? data : null;
  } catch { return null; }
}

export function videoRange(header: string | undefined, size: number): { start: number; end: number } | null {
  if (!header) return { start: 0, end: size - 1 };
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]), size - 1) : size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return null;
  return { start, end };
}

/** PostgreSQL native large objects: real file bytes in the DB, no external bucket
 * or schema change. A failed/interrupted upload rolls back both file and media. */
export async function storeDatabaseVideo(source: AsyncIterable<Uint8Array>, name: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const created = await client.query<{ oid: number }>("select lo_create(0) as oid");
    const oid = created.rows[0].oid;
    const hash = createHash("sha256");
    let size = 0;
    let written = 0;
    let mimeType: string | null = null;
    let pending: Buffer[] = [];
    let pendingSize = 0;
    const flush = async () => {
      const chunk = Buffer.concat(pending, pendingSize);
      mimeType ??= videoMimeType(chunk);
      if (!mimeType) throw Object.assign(new Error("Utilisez une vidéo MP4 ou WebM compatible avec le navigateur."), { status: 415 });
      await client.query("select lo_put($1::oid,$2::bigint,$3::bytea)", [oid, written, chunk]);
      hash.update(chunk);
      written += chunk.length;
      pending = []; pendingSize = 0;
    };
    for await (const part of source) {
      size += part.length;
      if (size > MAX_VIDEO_BYTES) throw Object.assign(new Error("La vidéo dépasse la limite de 200 Mo."), { status: 413 });
      pending.push(Buffer.from(part)); pendingSize += part.length;
      if (pendingSize >= VIDEO_CHUNK_BYTES) await flush();
    }
    if (!size) throw Object.assign(new Error("Le fichier vidéo est vide."), { status: 400 });
    if (pendingSize) await flush();
    const metadata: VideoMetadata = { oid, bytes: size, mimeType: mimeType!, sha256: hash.digest("hex") };
    const result = await client.query(
      "insert into media(name,url,public_id,resource_type) values($1,$2,$3,'video') returning id,name,public_id as \"publicId\",resource_type as \"resourceType\",created_at as \"createdAt\"",
      [name, JSON.stringify(metadata), `${VIDEO_PREFIX}${metadata.sha256}`],
    );
    await client.query("COMMIT");
    const row = result.rows[0];
    return { ...row, url: `/api/media/${row.id}/video`, createdAt: row.createdAt.toISOString() };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
