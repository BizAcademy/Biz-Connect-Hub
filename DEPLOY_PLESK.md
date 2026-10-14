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
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — pour l'upload des images
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — pour le stockage des vidéos (Supabase Storage, bucket `videos`)
   - `SESSION_SECRET`
   - `PORT` — fourni automatiquement par Passenger (sinon 3000 par défaut)

## Base de données

Le schéma doit exister dans la base PostgreSQL visée par `DATABASE_URL`. Si c'est une nouvelle base, exécuter une fois depuis un environnement de dev :

```
DATABASE_URL=<url de la base Plesk> pnpm --filter @workspace/db push
```

Pour chaque mise à jour contenant une migration versionnée, exécuter **avant le déploiement Plesk** depuis Replit ou un environnement de maintenance disposant de `pnpm` :

```
DATABASE_URL=<url de la base Plesk> pnpm --filter @workspace/db run migrate
```

Cette commande est sûre à rejouer : elle applique uniquement les migrations non encore enregistrées. Ne redémarrez pas l’API Plesk tant qu’elle n’a pas réussi.

## Flux de mise à jour

1. Sur Replit : faire les modifications, puis lancer `pnpm run build:plesk` (régénère `artifacts/api-server/dist/`), commit + push sur GitHub.
2. Si la mise à jour comporte une migration, lancer `DATABASE_URL=<url de la base Plesk> pnpm --filter @workspace/db run migrate` depuis Replit ou un environnement de maintenance, et attendre qu’elle réussisse.
3. Sur Plesk : **Pull** depuis GitHub → **Deploy Now** → **Restart App**.

C'est tout — l'application redémarre avec la nouvelle version sans rebuild.

## Images et vidéos conservées en base

Les images originales restent dans PostgreSQL. Les copies JPEG/PNG adaptées à
l’affichage sont générées par le serveur et mises en cache ; elles ne remplacent
pas les originaux.

L’import des vidéos de témoignages accepte MP4/WebM jusqu’à 200 Mo. Les fichiers
sont conservés dans les objets binaires natifs de PostgreSQL et servis par
morceaux pour permettre la lecture et le déplacement dans la vidéo. Cette
fonctionnalité ne nécessite pas de nouvelle migration de tables. L’autre choix
dans l’administration est l’intégration YouTube, qui conserve seulement un lien.

Le proxy de l’hébergement doit accepter la taille des fichiers importés ; une
limite du proxy inférieure à 200 Mo reste prioritaire. Pour une vidéo trop
volumineuse ou une connexion d’envoi lente, utiliser l’intégration YouTube.

**Sauvegardes :** inclure les objets binaires PostgreSQL, pas seulement les tables
(`pg_dump --blobs`, ou une sauvegarde complète équivalente), et vérifier leur
restauration. Une exportation des seules tables ne contient pas les fichiers vidéo.
