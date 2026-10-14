export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const DATABASE_IMAGE_PREFIX = "database:";

/** Detect supported raster images from their bytes, not the supplied filename. */
export function imageMimeType(bytes: Buffer): string | null {
  if (bytes.length < 12) return null;
  if (bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))) return "image/gif";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (
    bytes.toString("ascii", 4, 8) === "ftyp" &&
    /avif|avis/.test(bytes.toString("ascii", 8, Math.min(bytes.length, 40)))
  ) return "image/avif";
  if (bytes.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]))) return "image/x-icon";
  return null;
}

export function databaseImageUrl(id: number): string {
  return `/api/media/${id}/content`;
}

export function encodeDatabaseImage(bytes: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

export function decodeDatabaseImage(value: string): { bytes: Buffer; mimeType: string } | null {
  const match = /^data:(image\/(?:png|jpeg|gif|webp|avif|x-icon));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_IMAGE_BYTES || bytes.toString("base64") !== match[2] || imageMimeType(bytes) !== match[1]) return null;
  return { bytes, mimeType: match[1] };
}
