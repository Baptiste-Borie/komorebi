# V0.48 — Atelier comparatif du jardinier (direction artistique)

**Cet atelier ne modifie pas encore le personnage final.** Il évite les changements esthétiques à l'aveugle en donnant une référence annotée commune.

## Utilisation

1. Depuis le dépôt : `npm run dev` puis ouvrir `http://localhost:5173/?kaykit=1`.
2. Dans l'atelier KayKit, cliquer **Comparer avec notre ancien jardinier**.
3. L'ancienne version V0.44 et la nouvelle V0.47 s'affichent côte à côte, à hauteur égale et sous la même lumière.
4. Tourner les deux modèles simultanément, inspecter les maillages par clic, et sélectionner pour chaque zone **Ancien** ou **Nouveau**.
5. Ajouter des remarques aux zones et dans le champ d'avis général.
6. Cliquer **Exporter mes choix + capture**. Envoyer l'unique fichier `.json` produit pour la prochaine itération.

Le fichier JSON contient les décisions, les notes, le maillage cliqué, la caméra et une capture PNG intégrée (encodée en base64). Les champs restent en mémoire locale lors des comparaisons suivantes.

## Limites importantes

- Les deux modèles n'ont **pas le même squelette** : la référence Blender V0.44 et la version KayKit V0.47 sont présentées côte à côte mais leurs meshes ne sont pas directement interchangeables.
- Le choix *Ancien*/*Nouveau* est une instruction artistique, **pas** une opération de remplacement automatique de géométrie.
- Le statut `propositions_non_validees` reste toujours présent dans l'export : seul le joueur valide un résultat **après avoir vu la version modifiée**.
- Les animations se vérifient toujours dans l'atelier KayKit ; la comparaison est volontairement statique pour travailler les formes.
- Une fois les références fixées, on conserve de préférence le rig KayKit compatible avec les animations et on reconstruit/ajuste seulement les parties nécessaires avec Blender et transfert de poids.
