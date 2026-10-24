# Komorebi V0.39 — coupe courte et épaules affinées

Suite de la V0.38 : jeune jardinier, coupe courte ébouriffée, visage doux et tenue conservés.

## Modifications

- Nouvelle calotte de cheveux bruns, nuque courte, côtés dégagés et trois mèches sous le chapeau.
- Reconstruction du volume du crâne auparavant masqué par les cheveux longs KayKit.
- Manches avec sommet arrondi, volume réduit et raccord incliné vers le torse.
- Revers plus fins ; volume du pantalon légèrement réduit aux hanches.
- Aucun changement à Earthworks, aux plantes ou à l'interface générale ; seul le chemin GLB du Character Lab change.

La base sculptée, les oreilles, les mains et les bottines conservent la provenance KayKit Rogue 1.0 / Kay Lousberg / CC0 documentée dans `docs/V038_CHARACTER.md`. La licence et le GLB source restent dans `assets/characters/sources/kaykit/`.

## Reproduction

```bash
blender -b --threads 6 --python-exit-code 1 --python scripts/blender/build_gardener_v039.py
npm run build
npx playwright install chromium
node scripts/review-character-v039.mjs
```

`-- --draft` produit des rendus rapides ; `-- --no-render` exporte sans rendu. `CHROMIUM_PATH` peut désigner un navigateur déjà installé.

Le .blend contient le personnage éditable et le studio séparé. Le GLB n'exporte que le personnage statique, sans rig, animation, caméra ou éclairage. Aucune topologie pour animation ni LOD n'est validé ici.

Testé avec Blender 4.5.9 LTS et les dépendances TypeScript/Vite/Three.js du dépôt. Blender 5.2.2 n'a pas été exécuté dans cet environnement. Les vues Blender et Character Lab du ZIP proviennent des fichiers livrés. Les rapports chiffrés sont dans `reviews/character-lab/v039/`.

## Application du correctif

Le script V0.39 vise une V0.38 déjà appliquée, commitée ou non. Il vérifie l'applicabilité et l'intégrité du fichier KayKit source ; il n'impose pas un dépôt globalement propre et ne bloque donc pas sur un `__pycache__` sans rapport avec le correctif. Il refuse les conflits sur les fichiers concernés, ne supprime aucun fichier, et ne fait ni commit ni push. Il est relançable : une seconde application détecte que le patch est déjà installé.

Depuis la racine du dépôt :

```bash
bash ~/Téléchargements/komorebi-v039.sh --check-only
bash ~/Téléchargements/komorebi-v039.sh
npm run dev
```

Les fichiers V0.38 sont conservés. Le builder V0.39 est autonome par rapport à celui de V0.38 et réutilise le même GLB source CC0.

## Contrôles de finition

Les passes de travail ont permis de corriger les ouvertures révélées par les cheveux courts, puis de remplacer le raccord rapporté par une extension du bord réel du crâne. La coiffure suit cette surface par projection radiale, avec une frange irrégulière intégrée au même maillage. La forme du visage V0.38 reste conservée.

Le patch est testé sur une V0.38 non commitée, avec un cache Python et un fichier sans rapport avec le correctif présents. Le build, le chargement du GLB, les vues face/profil/trois quarts, le recul de caméra et la réouverture du Character Lab font partie de la revue. Les résultats effectifs figurent dans les rapports JSON du ZIP.
