# Komorebi V0.47 — Jardinier KayKit

Cette version conserve le rig et les animations KayKit (assets gratuits CC0 importés localement).
Le Ranger original demeure inchangé dans `public/assets/kaykit-v045/character/`.

## Générer le modèle

```bash
python3 scripts/build_gardener_v046.py
npm run build
npm run review:gardener
```

Le générateur produit `public/assets/kaykit-v045/gardener-v047.glb`. Son entrée
est le Ranger FREE 2.0 déjà importé. Il échoue volontairement si la structure
du Ranger change : on ne retire jamais des composants inconnus au hasard.

Ouvrir `http://localhost:5173/?kaykit=1` après `npm run dev` pour comparer
la tenue avec l'original et inspecter les animations. Le curseur « Angle pelle »
permet de tester différents alignements de l'outil dans la main droite.
Ce paramètre est un réglage d'étude, pas une validation finale du geste.

## Revue

`npm run review:gardener` démarre Vite automatiquement si nécessaire, réalise
les captures du visage, des bras, de la marche et de trois phases de creusement,
puis regroupe PNG, diagnostics et GLB dans `reviews/komorebi-v047-review.zip`.
Les captures intermédiaires sont supprimées après archivage.

`npm run review:clean` : affiche ce qui serait supprimé sans toucher aux fichiers.
`npm run review:clean -- --apply` : applique ce nettoyage ciblé.
Les ZIP existants ne sont pas supprimés sauf avec l'option volontaire
`--archives --keep=N --apply`.

## À vérifier visuellement

- Épaules, coudes et poignets pendant la marche et le creusement.
- Couture de la salopette à la taille quand le personnage se penche.
- Position, inclinaison et contact de la pelle avec le sol.
- Cheveux, sourcils et expression sous trois angles.

Une absence d'erreur JavaScript ou glTF ne vaut **pas** validation artistique.
Aucun des assets KayKit importés ne doit être regénéré ou réécrit par le patch.
