---
name: Intégrité des vidéos Biz Connect
description: Pourquoi la compression temps réel dans le navigateur a été abandonnée.
---

Préserver les octets du fichier original lors de l’envoi. Ne pas réintroduire la compression temps réel via canvas, requestAnimationFrame et MediaRecorder.

**Why:** Le 2026-09-25, une vidéo compressée contenait 626 secondes d’audio mais seulement 169 secondes d’images. L’analyse des paquets du WebM source et du MP4 Cloudinary a confirmé que le défaut existait avant la conversion de lecture. Un gain de taille de 10 % ne justifie pas la perte des images ; une petite taille de sortie ne prouve pas l’intégrité du fichier.

**How to apply:** Toute future compression doit utiliser un traitement indépendant du rafraîchissement de l’onglet et vérifier l’intégrité des deux pistes sur toute la durée. Ne pas supposer ffmpeg disponible sur Plesk. Conserver séparément la compatibilité H.264 à la lecture ; elle ne peut pas restaurer des images absentes du fichier envoyé.

## Vérification de lecture

Ne pas assimiler une durée correcte dans ffprobe à une lecture validée dans le navigateur de l’utilisateur, ni un échec de décodage du navigateur automatisé à un défaut du fichier.

**Why:** Lors d’une investigation, les fichiers originaux et convertis se décodaient intégralement avec ffmpeg, tandis que le navigateur automatisé refusait toutes les vidéos H.264 dès le chargement et que le navigateur utilisateur affichait une autre durée. Ces observations ne prouvent pas une cause commune.

**How to apply:** Distinguer intégrité des pistes, URL réellement chargée, version déployée et capacité du navigateur de test. Présenter une invalidation de cache comme une mesure à confirmer, pas comme une cause démontrée.

## Conversion à la demande

Préférer le fichier original quand il est déjà compatible ; ne pas imposer une conversion Cloudinary à chaque lecture.

**Why:** Une URL originale H.264/AAC servait une vidéo de 684 secondes avec prise en charge des requêtes partielles, tandis que son URL de conversion renvoyait HTTP 200 et un MP4 de seulement 2,6 secondes. Un HTTP 200 sur une transformation ne garantit donc pas la disponibilité de la vidéo complète.

**How to apply:** Comparer les durées et pistes de l’original et de la conversion avant de conclure que le fichier envoyé est endommagé. Garder la conversion comme secours de compatibilité plutôt que comme chemin obligatoire.