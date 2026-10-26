# Jardinier V0.44 — Rig_Medium / Digging

## Résultat

Le livrable anime la géométrie et les matériaux du jardinier V0.44 sur les 23 os de `Rig_Medium`. Le GLB contient le clip KayKit `Digging` original et la pelle V0.44 calibrée. Aucun mesh du Ranger ou de V0.51 n'est actif dans le fichier.

- Blender éditable : `assets/characters/gardener-v044-rig-medium.blend`
- GLB animé : `public/assets/kaykit-v045/gardener-v044-rig-medium.glb`
- manifeste de construction : `public/assets/kaykit-v045/gardener-v044-rig-medium.build.json`
- rapport complet : `reviews/v044-rig-medium/final/REPORT.md`
- mesures sur 143 instants : `reviews/v044-rig-medium/final/measurements.json` et `frames.csv`
- captures : `reviews/v044-rig-medium/final/captures/`

## Reproduction

```sh
python3 scripts/build_gardener_v044_rig_medium.py
blender -b --factory-startup --python-exit-code 1 --python scripts/blender/save_gardener_v044_rig_medium.py
blender -b --factory-startup --python-exit-code 1 --python scripts/blender/verify_gardener_v044_rig_medium.py
blender -b --factory-startup --python-exit-code 1 --python scripts/blender/render_gardener_v044_rig_medium.py
npm run build
npm run review:gardener
```

Le script navigateur démarre Vite automatiquement quand l'environnement autorise l'écoute locale. Sinon, démarrer `npm run dev`, puis fournir `KOMOREBI_URL` au script de revue.

## Choix de rigging

Les pièces rigides (tête, visage, chapeau, détails, bottes, bib et accessoires) sont affectées à un os. Les mélanges sont réservés aux bras, jambes, cou, taille et raccords d'épaule. Les bras V0.44 ont été repliés géométriquement de leur pose basse vers la pose de liaison KayKit ; une correction progressive de profondeur sur l'avant-bras évite son passage dans le buste sans déplacer la couture d'épaule.

La pelle est enfant de `handslot.r`. Sa droite d'axe fixe est ajustée géométriquement aux surfaces des deux mains sur tout le cycle. La main droite garde une matrice de prise fixe ; la main gauche coulisse le long de l'axe tout en restant au contact. Le décalage final de la pelle est uniquement axial : il ne modifie aucune distance main–manche et place la lame sur le sol à l'instant d'impact déclaré (1/3 s).

## Limites à examiner visuellement

Les métriques ne constituent pas une validation esthétique. Les arêtes à poids unique passent le seuil de 1 %, mais les arêtes de transition multi-os présentent des ratios relatifs élevés sur certains très petits segments. Elles sont documentées séparément et doivent être jugées sur les captures, surtout aux épaules, coudes, manches et à la taille. Les volumes de bras cachés sous les manches et les coutures emboîtées restent mesurés comme recouvrements internes ; ils ne sont pas assimilés à des collisions visibles.

Les sources `gardener-v044.glb` et `Rig_Medium_Tools.glb` ne sont jamais réécrites. La validation artistique reste à la charge de l'utilisateur.
