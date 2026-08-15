---
name: Orval codegen quirks
description: Pitfalls when extending the OpenAPI spec and regenerating api-zod in this monorepo
---
- Component schema names must not collide with orval's operation-derived zod names (e.g. a schema named `RequestUploadUrlBody` clashes when an operation `requestUploadUrl` also generates `RequestUploadUrlBody`). Use distinct nouns like `UploadUrlRequest`/`UploadUrlResult`.
- Orval appends to `lib/api-zod/src/index.ts` on regen; after codegen ensure the file contains only the two star-exports (`generated/api`, `generated/types`).
- Admin-authed orval mutation hooks: pass headers via the second options arg `{ request: { headers: { 'x-admin-password': pwd } } }`.
