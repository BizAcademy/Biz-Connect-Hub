---
name: Compression vidéo Biz Connect
description: Décision de compression des vidéos envoyées depuis l’administration.
---

Les vidéos locales sont réencodées côté navigateur avant l’upload Cloudinary, avec une cible d’au moins 10 % de réduction. Si le navigateur ne permet pas la capture MediaRecorder ou si la réduction n’est pas atteinte, l’original est envoyé et l’interface l’indique.

**Why:** Les vidéos sont envoyées directement de l’interface vers Cloudinary ; une compression serveur nécessiterait de faire transiter de gros fichiers par l’API et de dépendre de ffmpeg sur Plesk.

**How to apply:** Conserver la compression avant la signature et l’upload Cloudinary. Ne pas déplacer ce traitement dans l’API sans revoir les limites de taille, les délais et la disponibilité de ffmpeg en production.