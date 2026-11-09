# Komorebi — Generative Art Experiment 002

Cette seconde passe transforme le chêne anglais (`Quercus robur`) en volumes botaniques denses, toujours dessinés sur Canvas 2D par une mosaïque de marques colorées.

## Technique

- `botany.ts` génère un squelette ramifié déterministe dirigé vers 19 masses de canopée composées à la main : neuf volumes principaux imbriqués et dix lobes de périmètre.
- `projection.ts` projette les coordonnées 3D avec une caméra isométrique orthographique.
- `artRenderer.ts` compose une image haute résolution hors écran. Les branches sont triées en profondeur et noyées sous une couche globale de feuillage ; le tronc utilise une enveloppe continue et effilée plutôt qu'une pile de segments.
- Chaque masse déforme une surface paramétrique par plusieurs fréquences. Les marques suivent cette surface, ses normales, sa profondeur, une lumière diffuse quantifiée et une approximation d'occlusion ambiante. Des fragments plus larges ferment le volume sous la couche fine sans recourir à un aplat elliptique.
- Le terrain conserve son champ de traits isométrique, avec une ombre de contact et une ombre portée douce.
- `camera.ts` ne déplace que le cache final : le panoramique et le zoom ne regénèrent pas l'arbre.

L'approche reprend de Subscapes les idées générales de projection, surface paramétrique, distribution structurée, orientation locale, occultation et lumière discrétisée. Elle n'en reprend ni la composition, ni les formes, ni la palette.

## Exécution

```bash
npm install
npm run dev
```

Revue automatisée et captures 1920 × 1080 :

```bash
npm run review:generative-oak
```

Les trois cadrages utilisent `?view=close` et `?view=far`; sans paramètre, la vue normale est affichée. Le script produit aussi un montage avant/après à partir de la capture normale conservée dans `HEAD`.

## Résultat de la revue

La passe finale dessine 44 859 marques, 151 segments de branches et 19 masses de canopée. La précomposition du cache 2880 × 2040 prend environ 375–457 ms dans Chromium headless ; le déplacement et le zoom ne déclenchent ensuite aucune nouvelle génération. Les trois cadrages et le montage comparatif ont été inspectés à leur résolution native, sans erreur console ni erreur de page.

Réussites observées : le feuillage domine désormais clairement la structure ; la silhouette est pleine, asymétrique et lisible dans la vue éloignée ; les branches principales entrent et sortent des masses au lieu de quadriller la couronne ; les surfaces hautes, les zones intermédiaires et les dessous forment une échelle de valeurs cohérente. Dans la vue rapprochée, les feuilles abstraites, traits et fragments restent discernables alors qu'ils fusionnent en volumes à distance normale.

Les captures normale, rapprochée, éloignée et comparative sont conservées dans `reviews/generative-art-001/`. L'archive livrable est `reviews/komorebi-generative-art-001-captures.zip`.

## Limites connues

- Le chêne est une interprétation botanique, pas une simulation scientifique.
- Quelques lobes périphériques révèlent encore leur construction quasi circulaire dans la vue éloignée, surtout à droite et sous la couronne.
- La cime reste légèrement plus pyramidale que le port très étalé de certains vieux `Quercus robur` ; l'abaisser davantage réduirait toutefois la séparation utile entre les masses supérieures.
- Le tronc est plus continu et mieux effilé, mais sa silhouette basse reste graphiquement simplifiée et pourrait recevoir des contreforts racinaires plus irréguliers.
- Les zones éclairées utilisent une gamme olive contrôlée ; un accent chaud supplémentaire pourrait améliorer la sensation de soleil sans fragmenter la cohésion actuelle.
- Le cache haute résolution privilégie la qualité sur le temps de génération initial et la mémoire.
- La variation saisonnière, le vent et les autres espèces sont volontairement hors périmètre.
