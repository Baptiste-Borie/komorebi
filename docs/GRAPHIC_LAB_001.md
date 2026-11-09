# Komorebi — Graphic Lab 001

## Objectif

Suspendre les travaux de jardinier 3D / Blender et tester rapidement plusieurs langages visuels. Le laboratoire remplace **la page d'accueil** : `index.html` charge `src/graphicLab/main.ts`. L'ancienne application, les fichiers GLB, les ateliers et les scripts historiques ne sont ni écrasés ni supprimés. Une seule ligne de l'ancienne page d'entrée change.

## Six expériences

| ID | Style | Principe technique |
|----|-------|--------------------|
| paper | Papier vivant | Géométrie Canvas en aplats, silhouettes et superpositions |
| ascii | Glyph Garden | Ré-échantillonnage de la scène sous forme de glyphes colorés |
| stipple | Herbier de points | Échantillonnage spatial par trame de points |
| riso | Riso botanique | Aplats en palette restreinte + trame de demi-teintes |
| etching | Jardin gravé | Traits de contours et hachures sensibles à la luminance |
| cyanotype | Bleu végétal | Palette bichromatique inspirée du cyanotype |

**Ce sont des prototypes**, pas des identités finales abouties. Le rendu ASCII, notamment, est un effet CPU inspiré des pratiques génératives et **n'est pas** une reproduction du pipeline d'Ansenjeo. Le pointillisme, l'ASCII, la riso et la gravure sont des post-traitements CPU ; leur coût mesuré n'est pas représentatif d'un shader GPU final.

## Modèle de données et comparaison équitable

- `scene.ts` contient une **source unique de vérité** : 14 espèces, positions, échelles et graines aléatoires déterministes.
- `render.ts` dessine une scène de jardin commune, avec terrain isométrique, mare et animation facultative du vent, puis applique les variantes graphiques.
- `styles.ts` décrit palettes, techniques et questions de recherche. Ajouter un style = ajouter une définition et, si nécessaire, un nouveau post-traitement.
- Aucun modèle 3D, asset téléchargé ou animation de personnage n'est nécessaire.
- Le bouton Comparaison montre exactement les mêmes specimens dans deux rendus ; les sliders modifient 4–14 espèces, 12–110 individus.
- Les votes, notes et réglages sont conservés localement (`komorebi-graphic-lab-v001`), séparés des anciennes sauvegardes de jardin. Export JSON via l'interface.

## Timebox et critères de sortie

Deux séances d'exploration maximum pour choisir **deux styles finalistes** :

1. 45–60 min : comparer l'ambiance à 5 espèces / 18 individus, puis 10 / 46.
2. 45–60 min : comparer la lisibilité à 14 espèces / 104 individus et noter les problèmes.

Pour retenir un style, vérifier (a) plaisir visuel sans retouches interminables ; (b) reconnaissance des familles de plantes ; (c) variation plausible de plusieurs espèces par la donnée seule ; (d) performance satisfaisante sur le PC cible (test avec et sans vent). L'attrait esthétique est le critère principal ; une belle miniature ne suffit pas si les plantes deviennent illisibles en scène dense.

**Stop condition :** si aucun des six ne convainc, on n'ajoute pas de features au jardin. On revoit la technique, éventuellement en substituant des sprites dessinés ou des shaders GPU, en conservant le système de scènes.

## Exécuter

```bash
npm ci
npm run dev
npm run build
node scripts/review_graphic_lab.mjs
```

La revue ouvre le labo avec Playwright, génère six captures `.webp`, puis une comparaison en scène dense, un manifeste et une archive ZIP lorsque `zip` est disponible. Les anciennes commandes `npm run review` et `npm run review:gardener` restent réservées au code historique et ne doivent pas servir à valider ce nouveau laboratoire.

## Étape suivante (PAS dans le patch)

Sélectionner au maximum deux directions, puis implémenter leurs variantes d'espèces avec un vrai cycle de croissance et des interactions *God Hand* (clic pour planter, déplacer, retirer). Ne pas recréer de personnage ou de pipeline de rigging avant validation de cette étape.
