import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import express from "express";
import { type Media } from "@workspace/db";
import { createDatabaseImagesRouter } from "../routes/database-images";
import { MAX_IMAGE_BYTES, decodeDatabaseImage, encodeDatabaseImage, imageMimeType } from "./database-images";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN9sAAAAASUVORK5CYII=", "base64");

test("image bytes survive database encoding without recompression", () => {
  assert.equal(imageMimeType(png), "image/png");
  const decoded = decodeDatabaseImage(encodeDatabaseImage(png, "image/png"));
  assert.equal(decoded?.mimeType, "image/png");
  assert.deepEqual(decoded?.bytes, png);
});

test("reject executable SVG, HTML, mismatched types and malformed base64", () => {
  for (const bytes of [Buffer.from("<svg onload='alert(1)'/>"), Buffer.from("<html>not an image</html>")]) {
    assert.equal(imageMimeType(bytes), null);
  }
  assert.equal(decodeDatabaseImage(encodeDatabaseImage(png, "image/jpeg")), null);
  assert.equal(decodeDatabaseImage("data:image/png;base64,!!!"), null);
  assert.equal(imageMimeType(Buffer.alloc(0)), null);
});

test("database upload route authenticates, stores original bytes and serves public images", async (t) => {
  const records = new Map<number, Media>();
  let nextId = 1;
  const app = express();
  app.use("/api", createDatabaseImagesRouter({
    async insert(values) {
      const row: Media = { ...values, id: nextId++, createdAt: new Date() };
      records.set(row.id, row);
      return row;
    },
    async find(id) { return records.get(id); },
  }, (req, res) => {
    if (req.get("x-admin-password") === "test-only") return true;
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  const send = (body: Uint8Array, authenticated = true, name = encodeURIComponent("témoignage.png")) => fetch(`${base}/media/uploads/database`, {
    method: "POST", body: new Uint8Array(body),
    headers: {
      "Content-Type": "application/octet-stream", "x-file-name": name,
      ...(authenticated ? { "x-admin-password": "test-only" } : {}),
    },
  });

  await t.test("unauthenticated upload never writes to storage", async () => {
    assert.equal((await send(png, false)).status, 401);
    assert.equal(records.size, 0);
  });
  await t.test("valid upload returns only metadata and a stable public URL", async () => {
    const response = await send(png);
    assert.equal(response.status, 201);
    const media = await response.json() as Media;
    assert.equal(media.name, "témoignage.png");
    assert.equal(media.resourceType, "image");
    assert.equal(media.url, `/api/media/${media.id}/content`);
    assert.match(media.publicId, /^database:/);
    assert(!JSON.stringify(media).includes("base64"));
    assert.deepEqual(decodeDatabaseImage(records.get(media.id)!.url)?.bytes, png);
    const content = await fetch(`http://127.0.0.1:${address.port}${media.url}`);
    assert.equal(content.status, 200);
    assert.equal(content.headers.get("content-type"), "image/png");
    assert.equal(content.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(Buffer.from(await content.arrayBuffer()), png);
    const cached = await fetch(`http://127.0.0.1:${address.port}${media.url}`, {
      headers: { "If-None-Match": content.headers.get("etag")!, "Cache-Control": "max-age=0" },
    });
    assert.equal(cached.status, 304);
  });
  await t.test("reject unsupported files, empty files and malformed filenames", async () => {
    assert.equal((await send(Buffer.from("<svg onload='alert(1)'/>"))).status, 415);
    assert.equal((await send(Buffer.alloc(0))).status, 400);
    assert.equal((await send(png, true, "%bad-escape")).status, 400);
    assert.equal(records.size, 1);
  });
  await t.test("reject files exceeding the limit without storing them", async () => {
    assert.equal((await send(Buffer.alloc(MAX_IMAGE_BYTES + 1))).status, 413);
    assert.equal(records.size, 1);
  });
  await t.test("unknown or invalid IDs never return other media", async () => {
    assert.equal((await fetch(`${base}/media/999/content`)).status, 404);
    assert.equal((await fetch(`${base}/media/nope/content`)).status, 400);
    assert.equal((await fetch(`${base}/media/0/content`)).status, 400);
    assert.equal((await fetch(`${base}/media/1.5/content`)).status, 400);
  });
});
