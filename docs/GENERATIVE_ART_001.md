# Komorebi — Generative Art Experiment 001

Cette expérience teste un chêne anglais (`Quercus robur`) dessiné sur Canvas 2D par une mosaïque de petites marques colorées.

## Technique

- `botany.ts` génère un squelette ramifié et des masses de canopée déterministes à partir d'une graine et de paramètres d'espèce.
- `projection.ts` projette les coordonnées 3D avec une caméra isométrique orthographique.
- `artRenderer.ts` compose une image haute résolution hors écran. Les branches sont triées en profondeur ; les feuilles suivent des masses ellipsoïdales, un échantillonnage en spirale d'or, les normales locales et une lumière diffuse quantifiée.
- Le terrain utilise des traits orientés par un champ continu. Les marques du feuillage emploient feuilles courtes, fragments et ponctuations plutôt qu'un nuage uniforme.
- `camera.ts` ne déplace que le cache final : le panoramique et le zoom ne regénèrent pas l'arbre.

L'approche reprend de Subscapes les idées générales de projection, géométrie paramétrique, distribution structurée, champs d'orientation et lumière discrétisée. Elle n'en reprend ni la composition, ni les formes, ni la palette.

## Exécution

```bash
npm install
npm run dev
```

Revue automatisée et captures 1920 × 1080 :

```bash
npm run review:generative-oak
```

Les trois cadrages utilisent `?view=close` et `?view=far`; sans paramètre, la vue normale est affichée.

## Résultat de la revue

La passe finale dessine 67 252 marques, 806 segments de branches et 97 masses de canopée. La précomposition du cache 2880 × 2040 prend environ 444–505 ms dans Chromium headless ; le déplacement et le zoom ne déclenchent ensuite aucune nouvelle génération. Les trois captures ont été inspectées à leur résolution native.

Réussites observées : silhouette étalée lisible dans la vue normale et la vue éloignée, tronc continu, hiérarchie de branches identifiable, masses de feuillage différenciées par orientation et valeur, et marques encore nettes dans la vue rapprochée. La parcelle isométrique situe l'arbre sans lui faire concurrence.

Les captures sont conservées dans `reviews/generative-art-001/`. L'archive livrable est `reviews/komorebi-generative-art-001-captures.zip`.

## Limites connues

- Le chêne est une interprétation botanique, pas une simulation scientifique.
- Les masses de canopée révèlent encore leur construction en lobes dans la vue éloignée.
- Certaines branches terminales restent trop droites et trop visibles ; une prochaine passe devrait mieux les noyer dans les volumes sans transformer le feuillage en aplats.
- La gamme de verts est volontairement sobre mais pourrait gagner un accent chaud mieux réparti dans les zones éclairées.
- Le cache haute résolution privilégie la qualité sur le temps de génération initial et la mémoire.
- La variation saisonnière, le vent et les autres espèces sont volontairement hors périmètre.
