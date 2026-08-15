---
name: Cloudinary media flow
description: Design decisions for the Cloudinary-backed media library (admin uploads)
---

# Cloudinary media flow

Flow: admin gets a signed upload signature from the API (`POST /media/uploads/signature`, folder fixed to `biz-connect`), uploads directly to Cloudinary `auto/upload`, then registers the asset via `POST /media`.

Rules (from a code-review pass):
- **Never trust client-provided URL/publicId/resourceType.** The server verifies the asset via the Cloudinary Admin API (Basic auth apiKey:apiSecret) and persists only the verified `secure_url`/`resource_type`; publicId must be inside the `biz-connect/` folder; max 50 MB (oversized assets are destroyed remotely).
- **Delete is Cloudinary-authoritative.** The DB row is removed only after destroy returns `ok` or `not found`; otherwise the request fails (502) so it can be retried — avoids orphaned remote assets.
- **Why:** the Cloudinary secret is higher-privilege than admin-session data; unverified publicIds would let a signed destroy hit arbitrary assets in the account.

Cloudinary signatures = sha1 of sorted `key=value` params joined by `&` + api secret; only the signed params may be sent in the upload form.
