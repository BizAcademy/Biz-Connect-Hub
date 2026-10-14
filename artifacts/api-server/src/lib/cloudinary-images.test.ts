import assert from "node:assert/strict";
import { test } from "node:test";
import { downloadCloudinaryImage, imageMigrationKey, imageReferences, isCloudinaryImage } from "./cloudinary-images";
import { decodeDatabaseImage, MAX_IMAGE_BYTES } from "./database-images";

const url = "https://res.cloudinary.com/demo/image/upload/sample.png";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN9sAAAAASUVORK5CYII=", "base64");

test("only allow HTTPS Cloudinary image URLs; never video or arbitrary network targets", () => {
  assert(isCloudinaryImage(url));
  assert(isCloudinaryImage("https://res.cloudinary.com/demo/image/upload/w_500/v123/file.jpg?x=1"));
  for (const bad of [
    "http://res.cloudinary.com/demo/image/upload/image.png",
    "https://res.cloudinary.com.attacker.test/demo/image/upload/image.png",
    "https://user:pass@res.cloudinary.com/demo/image/upload/image.png",
    "https://res.cloudinary.com:8443/demo/image/upload/image.png",
    "https://res.cloudinary.com/demo/video/upload/image.png",
    "http://127.0.0.1/private", "file:///etc/passwd",
  ]) assert.equal(isCloudinaryImage(bad), false);
});

test("migration keys are stable and keep transformed URLs distinct", () => {
  assert.equal(imageMigrationKey(url), imageMigrationKey(url));
  assert.notEqual(imageMigrationKey(url), imageMigrationKey(`${url}?different=1`));
  assert.match(imageMigrationKey(url), /^database:migration:[a-f0-9]{64}$/);
});

test("all configured image families are covered without rewriting video fields", () => {
  assert.equal(imageReferences.filter(ref => ref.table === "site_content").length, 6);
  assert(imageReferences.some(ref => ref.table === "portfolio_items"));
  assert(imageReferences.some(ref => ref.table === "media" && ref.typeColumn === "resource_type"));
  for (const ref of imageReferences) {
    assert(!ref.column.includes("video"));
    if (ref.table === "testimonials" || ref.table === "service_testimonials") assert.equal(ref.typeColumn, "media_type");
  }
});

test("download uses GET with no redirects and preserves exact image bytes", async () => {
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(input, url);
    assert.equal(init?.redirect, "manual");
    assert(init?.signal);
    assert.equal(init?.method, undefined);
    return new Response(png, { headers: { "Content-Type": "image/png" } });
  };
  const result = await downloadCloudinaryImage(url, fetcher);
  assert.deepEqual(decodeDatabaseImage(result)?.bytes, png);
});

test("blocked URLs never initiate a fetch", async () => {
  let called = false;
  const fetcher: typeof fetch = async () => { called = true; throw Error("must not happen"); };
  await assert.rejects(downloadCloudinaryImage("https://example.com/image.png", fetcher), { status: 400 });
  assert.equal(called, false);
});

test("redirects, missing assets, executable content and unreachable hosts fail safely", async () => {
  for (const status of [302, 404, 500]) {
    await assert.rejects(downloadCloudinaryImage(url, async () => new Response("unavailable", { status })), { status: 502 });
  }
  await assert.rejects(downloadCloudinaryImage(url, async () => new Response("<svg onload='alert(1)'/>")), { status: 415 });
  await assert.rejects(downloadCloudinaryImage(url, async () => { throw Error("timeout"); }), { status: 502 });
});

test("size limit applies to declared and streamed bytes", async () => {
  await assert.rejects(downloadCloudinaryImage(url, async () => new Response(png, {
    headers: { "Content-Length": String(MAX_IMAGE_BYTES + 1) },
  })), { status: 413 });
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_IMAGE_BYTES));
      controller.enqueue(new Uint8Array(1));
      controller.close();
    },
  });
  await assert.rejects(downloadCloudinaryImage(url, async () => new Response(body)), { status: 413 });
});
