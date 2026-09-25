---
name: Motion sans perturber les interactions
description: Contraintes à conserver pour les animations globales du site.
---

Les animations doivent préserver les éléments vidéo et les formulaires montés, ainsi que le positionnement fixe du menu. Ne pas ajouter une transition de route qui transforme tout le contenu ou remonte les médias lors d’un changement d’état.

**Why:** Le site combine un menu fixe, des lecteurs longs et des formulaires administratifs. Une animation globale de leur ancêtre peut déplacer le menu, interrompre une lecture ou perdre la saisie. L’effet visuel demandé ne justifie pas ces régressions.

**How to apply:** Préférer des apparitions par blocs sans superposition d’animations imbriquées. Garder les contrôles vidéo stables et rendre le contenu immédiatement accessible en mouvement réduit, au clavier et à l’impression.