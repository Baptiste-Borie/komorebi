# V0.49 — direction du jardinier (retours du 26 octobre 2026)

**Statut esthétique : NON VALIDÉ.** Ne pas déclarer un modèle terminé sans accord explicite.

Source de comparaison : ancien `gardener-v044.glb` / nouveau `gardener-v047.glb`.
Source humaine : export Character Review + précisions orales du 26/10.

| Zone | Référence cible | Contrainte de réalisation |
| --- | --- | --- |
| Visage / bouche / yeux | **Nouveau KayKit** | Garder ses proportions douces et sa bouche. |
| Cheveux | **Ancien jardinier** | Reprendre sa coiffure, pas seulement recolorer Ranger. |
| Chapeau | **Ancien jardinier** | L'installer proprement sur l'os tête. |
| Torse / salopette | **Ancien jardinier** | Refaire une couche de vêtement cohérente, sans bib plaqué ni traversées. |
| Bras | **Aspect ancien** | Attache d'épaule naturelle comme le nouveau ; segments bras/avant-bras/main anatomiquement lisibles, weights au coude et poignet. Supprimer les strates de gants/brassards RPG. |
| Jambes | **Ranger_LegLeft / Ranger_LegRight du nouveau** | Conserver EXACTEMENT leur silhouette et leur épaisseur. |
| Chaussures | **Nouveau KayKit** | Garder le modèle et la largeur. |

**Approche technique :** conserver le Rig_Medium KayKit et ses animations.
L'ancien rig est uniquement une référence de formes. Toute pièce transposée
doit être pondérée correctement pour Rig_Medium (test Idle / Walk / Dig / Digging).

**Critères d'acceptation avant 'terminé' :** face, profil, dos, pose bras levés,
marche, creusement, absence d'intersections/strates sur les vêtements, chaussure
intacte, comportement coude/poignet sans cassure. Décision finale : utilisateur.

## Publication

Après `npm run review:gardener` ou `npm run review` **réussi**, le script exécute
automatiquement `npm run build`, `git add -A` (hors reviews temporaires),
commit et `git push origin main`. Aucun second appel n'est nécessaire.
Échec build/revue => aucun push. Échec réseau/push => échec visible, commit local conservé.
Pour une revue **sans publication**, préfixer de `KOMOREBI_NO_AUTO_PUSH=1`.
Le simple `git apply` ne déclenche pas de hook Git ; le push survient après revue.
