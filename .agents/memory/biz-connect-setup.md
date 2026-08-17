---
name: Biz Connect Hub setup
description: Configuration du projet BizAcademy/Biz-Connect-Hub dans cet espace de travail Replit.
---

## Workflow de déploiement utilisateur
Le code source est édité ici dans Replit. Après chaque modification :
1. Pousser le code sur GitHub (branch: main)
2. L'utilisateur va sur Cybrancy : Pull now → Deploy now → Restart now

## Git remote
- remote: https://github.com/BizAcademy/Biz-Connect-Hub.git
- branch: main
- Pousser avec: `git add -A && git commit -m "..." && git push origin main`

## Artifacts et workflows
- Frontend: `artifacts/biz-connect: web` (port 19698, previewPath `/`)
- Backend API: `artifacts/api-server: API Server` (port 8080, path `/api`)

## Stack
- Frontend: React + Vite + Tailwind (artifacts/biz-connect)
- Backend: Express 5 + Drizzle ORM + PostgreSQL (artifacts/api-server)
- Médias: Cloudinary (upload signé via /api/media/uploads/signature)

## Base de données
- Schéma dans lib/db/src/schema/ (leads, site_content, notifications, site_items, media)
- Pousser les changements: `pnpm --filter @workspace/db run push`

**Why:** Le projet a été cloné depuis GitHub car l'espace Replit était un template vide. L'artifact biz-connect a dû être recréé proprement (l'ID path-based du repo n'était pas reconnu par Replit).

**How to apply:** Avant chaque modification, vérifier que les deux workflows tournent. Après modification, git push sur main.
