import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, mediaTable } from "@workspace/db";
import { databaseImageUrl, decodeDatabaseImage, encodeDatabaseImage, imageMimeType, MAX_IMAGE_BYTES } from "./database-images";

// Explicit image-only registry. Video URLs and arbitrary links are never rewritten.
export const imageReferences = [
  { table: "site_content", column: "hero_image_url", label: "Accueil" },
  { table: "site_content", column: "community_image_url", label: "Communauté" },
  { table: "site_content", column: "countries_icon_url", label: "Pays" },
  { table: "site_content", column: "gains_poster_url", label: "Gains" },
  { table: "site_content", column: "gains_secondary_image_url", label: "Gains" },
  { table: "site_content", column: "promo_poster_url", label: "Affiche vidéo" },
  { table: "trainings", column: "banner_url", label: "Formations" },
  { table: "testimonials", column: "media_url", label: "Témoignages", typeColumn: "media_type" },
  { table: "portfolio_items", column: "image_url", label: "Portfolio" },
  { table: "ambassadors", column: "image_url", label: "Ambassadeurs" },
  { table: "partners", column: "logo_url", label: "Partenaires" },
  { table: "payment_methods", column: "logo_url", label: "Paiements" },
  { table: "services", column: "icon_url", label: "Services" },
  { table: "service_testimonials", column: "media_url", label: "Témoignages des services", typeColumn: "media_type" },
  { table: "feature_items", column: "image_url", label: "Accès inclus" },
  { table: "media", column: "url", label: "Bibliothèque", typeColumn: "resource_type" },
] as const;

export class ImageMigrationError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function isCloudinaryImage(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" &&
      !url.username && !url.password && !url.port &&
      /^\/[^/]+\/image\/(?:upload|fetch)\//.test(url.pathname);
  } catch { return false; }
}

export function imageMigrationKey(url: string): string {
  return `database:migration:${createHash("sha256").update(url).digest("hex")}`;
}

function imageOnly(ref: typeof imageReferences[number]) {
  return "typeColumn" in ref ? sql`and ${sql.identifier(ref.typeColumn)} = 'image'` : sql``;
}

export async function listCloudinaryImages(executor: Pick<typeof db, "execute"> = db) {
  const parts = imageReferences.map(ref => sql`
    select ${sql.identifier(ref.column)} as url, ${ref.label}::text as location
    from ${sql.identifier(ref.table)}
    where ${sql.identifier(ref.column)} like 'https://res.cloudinary.com/%' ${imageOnly(ref)}
  `);
  const result = await executor.execute<{ url: string; location: string }>(sql.join(parts, sql` union all `));
  const images = new Map<string, { url: string; name: string; locations: string[]; references: number }>();
  for (const row of result.rows) {
    if (!isCloudinaryImage(row.url)) continue;
    const item = images.get(row.url) ?? {
      url: row.url, name: new URL(row.url).pathname.split("/").pop() || "Image",
      locations: [], references: 0,
    };
    item.references++;
    if (!item.locations.includes(row.location)) item.locations.push(row.location);
    images.set(row.url, item);
  }
  return [...images.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Exact allowlisted HTTPS host, no redirects, bounded streaming and deadline. */
export async function downloadCloudinaryImage(url: string, fetcher: typeof fetch = fetch) {
  if (!isCloudinaryImage(url)) throw new ImageMigrationError("Adresse Cloudinary non autorisée.");
  let response: Response;
  try {
    response = await fetcher(url, { redirect: "manual", signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new ImageMigrationError("Cloudinary ne répond pas. Réessayez plus tard.", 502);
  }
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new ImageMigrationError(`Image inaccessible sur Cloudinary (HTTP ${response.status}). L'original est conservé.`, 502);
  }
  if (Number(response.headers.get("content-length")) > MAX_IMAGE_BYTES) {
    await response.body.cancel();
    throw new ImageMigrationError("Cette image dépasse 10 Mo. Son lien actuel est conservé.", 413);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new ImageMigrationError("Cette image dépasse 10 Mo. Son lien actuel est conservé.", 413);
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ImageMigrationError) throw error;
    throw new ImageMigrationError("Téléchargement interrompu. Le lien actuel est conservé.", 502);
  } finally { reader.releaseLock(); }
  const bytes = Buffer.concat(chunks);
  const mimeType = imageMimeType(bytes);
  if (!mimeType) throw new ImageMigrationError("Format non pris en charge (PNG, JPEG, WebP, GIF, AVIF ou ICO requis). Le lien actuel est conservé.", 415);
  return encodeDatabaseImage(bytes, mimeType);
}

export async function migrateCloudinaryImage(url: string) {
  if (!isCloudinaryImage(url)) throw new ImageMigrationError("Adresse Cloudinary non autorisée.");
  const key = imageMigrationKey(url);
  const [previous] = await db.select().from(mediaTable).where(eq(mediaTable.publicId, key)).limit(1);
  const candidate = (await listCloudinaryImages()).find(image => image.url === url);
  if (!candidate && !previous) throw new ImageMigrationError("Cette image n'est pas enregistrée sur le site.", 404);
  const payload = previous?.url ?? await downloadCloudinaryImage(url);
  if (!decodeDatabaseImage(payload)) throw new ImageMigrationError("Impossible de vérifier la copie de l'image.", 500);

  return db.transaction(async tx => {
    // Prevent duplicate copies under double clicks or concurrent administrator sessions.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
    const [existing] = await tx.select().from(mediaTable).where(eq(mediaTable.publicId, key)).limit(1);
    const current = (await listCloudinaryImages(tx)).find(image => image.url === url);
    if (!current && !existing) throw new ImageMigrationError("L'image a changé pendant le transfert. Actualisez la liste.", 409);
    const migrated = await tx.update(mediaTable).set({ url: payload, publicId: key })
      .where(and(eq(mediaTable.url, url), eq(mediaTable.resourceType, "image"))).returning();
    let image = existing ?? migrated.sort((a, b) => a.id - b.id)[0];
    if (!image) {
      [image] = await tx.insert(mediaTable).values({
        name: current?.name ?? "Image transférée", url: payload, publicId: key, resourceType: "image",
      }).returning();
    }
    const newUrl = databaseImageUrl(image.id);
    let replacedReferences = 0;
    for (const ref of imageReferences) {
      if (ref.table === "media") continue;
      const updated = await tx.execute(sql`
        update ${sql.identifier(ref.table)} set ${sql.identifier(ref.column)} = ${newUrl}
        where ${sql.identifier(ref.column)} = ${url} ${imageOnly(ref)}
      `);
      replacedReferences += updated.rowCount ?? 0;
    }
    return { id: image.id, url: newUrl, replacedReferences };
  });
}
