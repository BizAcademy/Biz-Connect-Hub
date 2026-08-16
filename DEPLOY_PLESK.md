# Déploiement sur Plesk (sans build côté serveur)

Le dépôt contient déjà l'application **pré-buildée** :

- `artifacts/api-server/dist/index.mjs` — serveur Node bundlé (API + frontend)
- `artifacts/api-server/dist/public/` — frontend buildé (servi par le serveur)
- `app.js` — fichier de démarrage pour Plesk / Phusion Passenger

Aucun `npm install` ni build n'est nécessaire sur Plesk : le serveur est un bundle autonome.

## Configuration Plesk (Node.js)

1. **Application Root** : la racine du dépôt cloné
2. **Application Startup File** : `app.js`
3. **Application Mode** : `production`
4. **Variables d'environnement** (obligatoires) :
   - `DATABASE_URL` — chaîne de connexion PostgreSQL
   - `ADMIN_PASSWORD` — mot de passe admin du site
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — pour l'upload des médias
   - `SESSION_SECRET`
   - `PORT` — fourni automatiquement par Passenger (sinon 3000 par défaut)

## Base de données

Le schéma doit exister dans la base PostgreSQL visée par `DATABASE_URL`. Si c'est une nouvelle base, exécuter une fois depuis un environnement de dev :

```
DATABASE_URL=<url de la base Plesk> pnpm --filter @workspace/db push
```

## Flux de mise à jour

1. Sur Replit : faire les modifications, puis lancer `pnpm run build:plesk` (régénère `artifacts/api-server/dist/`), commit + push sur GitHub.
2. Sur Plesk : **Pull** depuis GitHub → **Deploy Now** → **Restart App**.

C'est tout — l'application redémarre avec la nouvelle version sans rebuild.
