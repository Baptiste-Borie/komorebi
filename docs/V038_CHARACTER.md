# Komorebi — jardinier statique V0.38

## Direction et audit

La V0.37 utilisait surtout des primitives juxtaposées : membres segmentés, visage chargé et chapeau détaché. Le pipeline et le .blend ont été examinés et rendus avant refonte. Cette version repart du **Rogue KayKit Adventures 1.0**, une vraie géométrie CC0. Les aperçus officiels KayKit, la planche actuelle et un rendu du Rogue importé ont été étudiés. Animal Crossing sert de référence secondaire de proportions, sans reprendre ses assets.

Le pack gratuit actuel et son offre de sources Blender payantes ont été distingués. Le GLB du dépôt officiel KayKit 1.0 constitue une base disponible, vérifiable et reproductible. Aucun fichier Blender payant n'a été utilisé.

## Provenance

- Auteur : **Kay Lousberg / KayKit**.
- Référence artistique : https://kaylousberg.itch.io/kaykit-adventurers
- Source technique : https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
- Commit : `672074b73ba276876a19e8816ecdc5241817ab47`.
- Source : `addons/kaykit_character_pack_adventures/Characters/gltf/Rogue.glb`.
- SHA256 : `e825437cd4d2ee9c1960b517a74a69101e33eb409ae7fa8cedc7134a998fbb7d`.
- Licence CC0 : `assets/characters/sources/kaykit/LICENSE.txt`.

Le fichier original archivé comporte son rig et ses animations. Le jardinier exporté ne les contient pas.

## Construction

Tête, oreilles, mains et bottines dérivent du maillage KayKit. Le nez est réduit, les yeux noirs remodelés et ajustés au visage, les sourcils détendus et le sourire posé sur la surface. La chevelure est raccourcie et ajustée sous le chapeau.

Les avant-bras prolongent les frontières réelles des poignets. Le pantalon est un maillage continu avec siège, entrejambe et jambes. Chemise, manches, revers, bavette, poche et bretelles sont des surfaces dédiées, projetées sur le corps. Le chapeau possède une ouverture ovale, un bord courbé épais et une calotte modelée. Seuls les boutons utilisent des cylindres accessoires.

Palette : lin écru, vert jardin, cuir brun, châtain et paille dorée. Les valeurs sRGB sont converties en linéaire pour Blender et GLTF.

## Revue visuelle

Trois passes de travail ont été inspectées avant les rendus finaux :

1. Cheveux traversant le ruban, chevauchements aux hanches, ouverture à la nuque et manches détachées repérés.
2. Chevelure reprofilée sous la calotte et à la nuque ; tissu caché retiré dans le pantalon ; raccord des manches reconstruit.
3. Épaules fermées, débordement de peau supprimé, poignets adoucis et nez réduit.

Après une interruption de session, les sources ont été reconstruites à partir de ces corrections. Les fichiers livrés sont régénérés et inspectés à nouveau. Les images sont des rendus du vrai maillage, pas des illustrations conceptuelles.

Les captures `lab-*.png` montrent le GLB dans le vrai Character Lab, chargé isolément pour éviter de mesurer le terrain. Son éclairage existant est volontairement conservé : il est plus contrasté que le studio Blender. Une planche à 256, 128 et 64 pixels permet d'apprécier la lecture à petite taille.

## Reproduction

```bash
blender --background --threads 6 --python-exit-code 1 --python scripts/blender/build_gardener_v038.py
npm ci
npm run build
npx playwright install chromium
node scripts/review-character-v038.mjs
```

Options Blender après `--` : `--draft` ou `--no-render`. `CHROMIUM_PATH` désigne éventuellement un Chromium déjà installé. Rendus et rapports : `reviews/character-lab/v038/`, ignoré par Git.

Testé avec **Blender 4.5.9 LTS**, Three.js et TypeScript/Vite du dépôt, Chromium avec SwiftShader. Blender 5.2.2 n'était pas disponible et n'est pas annoncé comme testé. Les rapports donnent les valeurs mesurées de l'export et les résultats du build et du navigateur.

## Périmètre

Asset statique, sans animation, rig ou intégration au personnage jouable. Les vêtements sont séparés et éditables ; ce n'est pas un corps nu complet, un maillage étanche pour impression 3D ou une topologie validée pour déformation. Aucun LOD ni benchmark GPU de production.

Le seul changement applicatif est le chemin du GLB dans `src/characterLab.ts`. Earthworks, les plantes et l'interface générale restent inchangés. Les fichiers V0.37 sont conservés.

Le patch Bash s'applique depuis la racine d'un checkout propre du commit `882af4a9c10759fb1ad2b486e27cf7c32c10c506`. Il vérifie puis applique les fichiers et lance le build, sans commit ni push. `--check-only` vérifie l'applicabilité sans modifier le dépôt. Conserver le script téléchargé hors du dépôt pour ne pas déclencher sa protection contre les fichiers non suivis.
