# Komorebi — laboratoire de rendus

Un petit jardin interactif, destiné à comparer **trois styles graphiques rendus en temps réel** : low-poly 3D, 3D organique et illustration vectorielle SVG. Aucun asset produit à la main.

## Démarrer

```bash
npm install
npm run dev
```

Ouvrir l'URL donnée par Vite. Sélectionner un style dans l'en-tête, puis cliquer sur le jardin pour ajouter des plantes ou activer la suppression. En 3D, glisser pour faire tourner le jardin, utiliser la molette pour zoomer. « Jardin dense » permet un test de lisibilité. Les modifications sont conservées en localStorage.

## Vérifier

```bash
npm run build
npx playwright install chromium
npm run review
```

Le dernier script produit `komorebi-review.zip` avec six captures, puis supprime les PNG temporaires. Il nécessite la commande `zip` sous Linux. La revue n'est pas indispensable pour jouer.

## Positionnement

Cette version est un **comparateur visuel et un prototype de placement**, pas encore une simulation de croissance. Les styles partagent la même disposition et les mêmes données de jardin. La variante « organique » reste volontairement simple : la vraie évaluation devra se faire après plusieurs itérations visuelles.

## Patrimoine de l'ancien projet

Les anciens documents `docs/` sont conservés sur le dépôt d'origine et l'historique Git. Le code Phaser de démonstration, les images du template et les anciens scripts de build ne sont plus nécessaires à ce laboratoire.
