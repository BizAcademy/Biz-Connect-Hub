---
name: Biz Connect déploiement Cybrancy/Plesk
description: Comment le site en prod est servi et le piège du dist/public commité
---
- Le site en ligne (bizconnectacademy.com, Cybrancy/Plesk) sert directement les fichiers commités dans `artifacts/api-server/dist/public/` (le .gitignore les dé-ignore exprès). "Deploy now" ne rebuild PAS le frontend.
- **Piège** : le build dev de l'api-server (`build.mjs`) vidait `dist/` entier, supprimant `dist/public` — un commit qui embarque cette suppression casse le site en prod ("Not Found"). `build.mjs` préserve maintenant `dist/public`.
- **Procédure après chaque modif frontend** : `cd artifacts/biz-connect && PORT=19698 BASE_PATH=/ pnpm run build`, puis copier `artifacts/biz-connect/dist/public` → `artifacts/api-server/dist/public`, commit et push.
- Le build vite exige les env vars `PORT` et `BASE_PATH` (prod = `/`).
- Push GitHub : `git push https://x-access-token:${GITHUB_PAT}@github.com/BizAcademy/Biz-Connect-Hub.git main`.
- Toute modification de schéma doit aussi être synchronisée sur la base ciblée avant le redémarrage de l'API. **Pourquoi :** l'API sélectionne les nouvelles colonnes dès son lancement ; une base non synchronisée fait échouer le contenu et l'accueil.
