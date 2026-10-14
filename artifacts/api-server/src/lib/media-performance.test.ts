import assert from "node:assert/strict";
import { test } from "node:test";
import { Jimp } from "jimp";
import { imageVariant } from "./image-variants";
import { readVideoMetadata, videoMimeType, videoRange } from "./database-videos";

test("video ranges cover seeking, suffixes and reject invalid or multipart ranges", () => {
  assert.deepEqual(videoRange(undefined, 100), { start: 0, end: 99 });
  assert.deepEqual(videoRange("bytes=0-9", 100), { start: 0, end: 9 });
  assert.deepEqual(videoRange("bytes=90-", 100), { start: 90, end: 99 });
  assert.deepEqual(videoRange("bytes=-10", 100), { start: 90, end: 99 });
  assert.deepEqual(videoRange("bytes=-200", 100), { start: 0, end: 99 });
  assert.deepEqual(videoRange("bytes=0-999", 100), { start: 0, end: 99 });
  for (const header of ["bytes=100-", "bytes=9-2", "bytes=-0", "bytes=0-1,5-6", "bad", "bytes=-"]) {
    assert.equal(videoRange(header, 100), null);
  }
});

test("video metadata and file signatures cannot expose arbitrary large objects", () => {
  const buffer = Buffer.alloc(24); buffer.write("ftypisom", 4);
  assert.equal(videoMimeType(buffer), "video/mp4");
  assert.equal(videoMimeType(Buffer.from("<svg>not video</svg>")), null);
  assert.equal(readVideoMetadata("https://example.com/video.mp4"), null);
  assert.equal(readVideoMetadata(JSON.stringify({ oid: -1, bytes: 5, mimeType: "text/html", sha256: "invalid" })), null);
  assert(readVideoMetadata(JSON.stringify({ oid: 123, bytes: 5, mimeType: "video/mp4", sha256: "a".repeat(64) })));
});

test("image variants reduce transfer size and retain originals and transparency", async () => {
  const jpeg = new Jimp({ width: 1600, height: 900, color: 0x336699ff });
  const original = await jpeg.getBuffer("image/jpeg", { quality: 95 });
  const before = Buffer.from(original);
  const variant = await imageVariant({ bytes: original, mimeType: "image/jpeg" }, 320);
  const decoded = await Jimp.read(variant.bytes);
  assert.equal(decoded.width, 320); assert.equal(decoded.height, 180);
  assert(variant.bytes.length < original.length);
  assert.deepEqual(original, before);
  const again = await imageVariant({ bytes: original, mimeType: "image/jpeg" }, 320);
  assert.equal(again.bytes, variant.bytes);
  const png = new Jimp({ width: 640, height: 320, color: 0xff000000 });
  const transparent = await png.getBuffer("image/png");
  const resized = await imageVariant({ bytes: transparent, mimeType: "image/png" }, 160);
  const result = await Jimp.read(resized.bytes);
  assert.equal(result.width, 160);
  assert.equal(result.getPixelColor(0, 0) & 0xff, 0);
  const gif = { bytes: Buffer.from("GIF89a"), mimeType: "image/gif" };
  assert.equal(await imageVariant(gif, 320), gif);
});
