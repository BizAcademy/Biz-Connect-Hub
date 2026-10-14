import { Jimp } from "jimp";
import { createHash } from "node:crypto";

export const IMAGE_WIDTHS = [64, 160, 320, 640, 960, 1440];
type Image = { bytes: Buffer; mimeType: string };
const cache = new Map<string, Image>();
const pending = new Map<string, Promise<Image>>();
let cacheBytes = 0;
const MAX_CACHE_BYTES = 32 * 1024 * 1024;

/** Original files stay untouched. GIF/AVIF/WebP retain their existing encoding. */
export async function imageVariant(image: Image, width: number): Promise<Image> {
  if (!IMAGE_WIDTHS.includes(width) || !["image/jpeg", "image/png"].includes(image.mimeType)) return image;
  const key = `${createHash("sha256").update(image.bytes).digest("hex")}:${width}`;
  const hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
  if (pending.has(key)) return pending.get(key)!;
  const task = (async () => {
    if (image.mimeType === "image/png" && image.bytes.length >= 24 &&
      image.bytes.readUInt32BE(16) * image.bytes.readUInt32BE(20) > 24_000_000) return image;
    const decoded = await Jimp.read(image.bytes, { "image/jpeg": { maxResolutionInMP: 24, maxMemoryUsageInMB: 128 } });
    if (decoded.width <= width || decoded.width * decoded.height > 24_000_000) return image;
    decoded.resize({ w: width });
    const bytes = image.mimeType === "image/jpeg"
      ? await decoded.getBuffer("image/jpeg", { quality: 80 })
      : await decoded.getBuffer("image/png");
    const result = bytes.length < image.bytes.length ? { bytes, mimeType: image.mimeType } : image;
    if (result.bytes.length <= MAX_CACHE_BYTES) {
      while (cacheBytes + result.bytes.length > MAX_CACHE_BYTES && cache.size) {
        const oldest = cache.keys().next().value!;
        cacheBytes -= cache.get(oldest)!.bytes.length; cache.delete(oldest);
      }
      cache.set(key, result); cacheBytes += result.bytes.length;
    }
    return result;
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}
