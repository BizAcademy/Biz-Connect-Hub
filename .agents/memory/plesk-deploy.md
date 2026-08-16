---
name: Plesk deployment flow
description: The app is hosted on Plesk (not Replit deployments); prebuilt dist is committed to git.
---

The user hosts Biz Connect Academy on **Plesk** via GitHub pull (not Replit deployments).

**Rule:** after any code change that should go live, run `pnpm run build:plesk` at repo root (bundles server + frontend into `artifacts/api-server/dist/`, which is force-included in git despite the `dist` ignore), commit, and push to `BizAcademy/Biz-Connect-Hub` `main` using the `GITHUB_PAT` secret (`git push https://x-access-token:$GITHUB_PAT@github.com/BizAcademy/Biz-Connect-Hub.git main:main`).

**Why:** Plesk runs `app.js` (Passenger startup, imports the bundled `dist/index.mjs`) with no npm install/build step; the repo must always contain a fresh production build. In production the Express server also serves the SPA from `dist/public` with an SPA fallback.

**How to apply:** see `DEPLOY_PLESK.md` for required env vars (DATABASE_URL, ADMIN_PASSWORD, CLOUDINARY_*, SESSION_SECRET). Schema changes still need a manual `pnpm --filter db push` against the Plesk DATABASE_URL.
