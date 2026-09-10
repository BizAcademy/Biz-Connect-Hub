---
name: Build frontend Biz Connect
description: Contraintes de compilation et de livraison propres à ce monorepo.
---

Le build frontend de Biz Connect doit recevoir explicitement `PORT` et `BASE_PATH`, même lorsque le workflow de développement les fournit implicitement.

**Why:** Sans ces variables, Vite échoue avant de compiler. Le serveur API est aussi livré sous forme de fichier compilé suivi par Git ; une modification de route backend doit donc être reconstruite avant la livraison.

**How to apply:** Utiliser `PORT=5173 BASE_PATH=/` pour le build frontend, copier `dist/public` vers `artifacts/api-server/dist/public`, et reconstruire le package API après toute modification serveur avant de pousser.