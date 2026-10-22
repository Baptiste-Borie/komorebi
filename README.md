# Komorebi — V0.22 GOLD OVERHAUL

Un diorama botanique en 3D low-poly : composer librement un jardin, puis le contempler. Three.js, TypeScript strict et Vite. Pas d’économie, de progression ou de simulation de croissance dans cette V1.

## Démarrer

```bash
npm ci
npm run dev
```

Clic pour planter, glisser pour tourner, molette pour zoomer. La barre supérieure permet de recentrer, ouvrir l’atelier botanique, densifier, passer en contemplation et ouvrir le menu. Les jardins existants restent compatibles avec la clé `komorebi-lab-v1` de localStorage.

## Vérifier

```bash
npm run build
npx playwright install chromium # une seule fois si nécessaire
npm run review
```

La revue teste le **build de production**, les interactions et les sauvegardes. Elle crée neuf captures ciblées dans `reviews/` : jardin, mare, scène dense, chêne, conifère, fougère et mare dans l’atelier. Chaque WebP possède des fragments Base64 reconstruits et vérifiés, avec un manifeste contenant les contrôles et les statistiques de rendu. Aucun PNG temporaire ni ZIP n’est conservé.

- `npm run review:quick` : cinq captures et les mêmes contrôles fonctionnels.
- `npm run review:full` : davantage d’angles, avec les mêmes contrôles.
- `npm run review -- --baseline` : quatre captures de référence, sans les nouveaux contrôles. Sert uniquement au script de migration, sur le build V0.21 encore présent dans `dist/`.

Un échec JavaScript, shader ou contrôle fonctionnel fait échouer la revue. Les anciennes captures ne sont remplacées que lorsque la revue complète réussit.

Pour un environnement de test particulier : `PLAYWRIGHT_EXECUTABLE_PATH` désigne un Chromium existant ; `KOMOREBI_SOFTWARE_GL=1` active SwiftShader. Les performances logicielles ne représentent pas celles d’une carte graphique.

## Rendu et portée

La calibration lumineuse, les matériaux partagés et l’eau sont regroupés dans `src/rendering/`. Les ombres sont recalculées lors des modifications du jardin. L’eau utilise un shader sans passe de réflexion, animé sauf si le système demande de réduire les mouvements. Le jardin cesse de rendre derrière l’atelier botanique.

Voir [la note V0.22](docs/V022_GOLD_OVERHAUL.md) pour les choix et limites. Les documents de conception plus anciens décrivent des orientations historiques (Phaser, pixel art, progression) ; ils ne définissent pas la V1 actuelle.
