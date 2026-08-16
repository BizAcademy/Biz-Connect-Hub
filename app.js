// Fichier de démarrage pour Plesk (Phusion Passenger).
// L'application est déjà buildée : le serveur bundlé se trouve dans
// artifacts/api-server/dist/index.mjs et sert aussi le frontend
// (artifacts/api-server/dist/public). Aucun build n'est nécessaire sur Plesk.
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || '3000';

import('./artifacts/api-server/dist/index.mjs').catch((err) => {
  console.error('Impossible de démarrer le serveur :', err);
  process.exit(1);
});
