---
name: Biz Connect — vidéos sur Supabase Storage
description: Les vidéos du site sont stockées sur Supabase Storage (bucket `videos`), les images restent sur Cloudinary.
---

Règle (mise à jour 18/08/2026) : l'utilisateur a finalement choisi de **rester sur Cloudinary** pour les nouveaux uploads vidéo (plan gratuit : 100 Mo max/fichier, upload chunké implémenté). Le support Supabase (bucket `videos`) reste en place côté serveur pour lire/supprimer les vidéos déjà migrées ; un panneau admin « Migration Cloudinary → Supabase » existe (tâche fusionnée) mais ne doit plus être encouragé. Longues vidéos (>100 Mo) : recommander YouTube « non répertoriée » via le champ URL.

**Why:** le plan gratuit Cloudinary refuse tout fichier > 100 Mo (vérifié par test réel — erreur "Your file exceeds the Free plan upload limit"). L'utilisateur veut des vidéos de ~400 Mo.

**How to apply:** le serveur (routes media) distingue par `publicId` : préfixe `videos/` = Supabase, `biz-connect/` = Cloudinary — enregistrement, validation (type vidéo, max 500 Mo) et suppression suivent la même branche. La prod Plesk/Cybrancy a besoin des env vars `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` (documentées dans DEPLOY_PLESK.md). Attention : le plan gratuit Supabase limite aussi les fichiers à 50 Mo — le plan Pro est requis pour les grosses vidéos, et la limite globale de taille de fichier se règle dans les paramètres Storage du projet Supabase.
