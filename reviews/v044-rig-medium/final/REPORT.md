# Rapport final — V0.44 / Rig_Medium / Digging

## Synthèse technique

État : **tous les contrôles physiques applicables passent** sur 143 instants du clip de 1,4 s. Le résultat est chargé par Komorebi et le navigateur a constaté un changement des matrices de `hand.r` et de la pelle entre 0 % et 45 %.

| Contrôle | Limite | Maximum final | Verdict |
|---|---:|---:|---:|
| Scale animé des os | 0,001 % | 0,000370 % | passe |
| Étirement, arêtes rigides | 1 % | 0,0277 % | passe |
| Écart main droite–manche | 0,5 % H | 0 % H | passe |
| Stabilité matrice prise droite | 0,001 % H | 0,0000179 % H | passe |
| Écart main gauche–manche | 0,5 % H | 0 % H | passe |
| Glissement pied gauche | 0,5 % H | 0,0144 % H | passe |
| Glissement pied droit | 0,5 % H | 0,00716 % H | passe |
| Pénétration sous le sol | 0,1 % H | 0,01996 % H | passe |
| Lame–sol à 0,333333 s | 0,5 % H | 0,00000169 % H | passe |
| Collision visible majeure | double seuil 0,5 % H / 0,1 % H² | 0 cas | passe |

Les valeurs exactes, les seuils et les échantillons figurent dans `measurements.json` et `frames.csv`.

## Classification des recouvrements

- 0 collision visible ou collision outil/corps au-dessus du double seuil final.
- 23 recouvrements bruts du volume continu du haut du bras, caché sous une manche. Ils sont conservés dans l'audit comme `covered_internal_overlaps`.
- 20 recouvrements de couture attendus (bib/salopette, botte/pantalon, manchette/chemise), conservés comme `expected_seams`.
- Les surfaces exposées de l'avant-bras, du poignet et de la main restent contrôlées ; le masque ne retire que les triangles majoritairement pondérés au haut du bras et couverts par la manche.

## Itérations

1. Première liaison complète : animation jouable, mais pelle trop basse et prises incorrectes.
2. Axe de pelle calibré à partir des surfaces des mains ; prises et impact améliorés.
3. Première correction progressive de l'avant-bras ; collision visible encore présente.
4. Correction de profondeur accrue et recalibration ; régression d'impact identifiée.
5. Inversion du sens de correction ; collisions fortement réduites, mais contact gauche et impact hors seuil.
6. Ajustement minimax de la droite de manche ; prises et impact passent, deux petits recouvrements persistent.
7. Correction finale de 2 cm sur l'avant-bras ; zéro collision visible, impact axial à recalibrer.
8. Translation de 3,14 cm le long de l'axe du manche ; toutes les vérifications passent sans changer les prises.

## Contenu et provenance

- 38 meshes glTF actifs, tous préfixés `V044_` ; Three.js expose 40 objets de rendu car il sépare les deux bottes multi-matériaux.
- 7 meshes d'outil proviennent également du V0.44.
- 8 payloads de meshes Ranger ont été retirés du document de sortie.
- 6 361 sommets rigides et 1 217 sommets à poids mélangés sur 7 551 sommets de personnage.
- 23 os KayKit ; clip `Digging` embarqué sans modification des courbes originales.

Empreintes des fichiers contrôlés :

- source V0.44 : `ee3c7836eee35433552e86f08d40347f1798792142408ea015a821d1ad479ca3`
- source KayKit Tools : `e3b62dc122c5073373376a846e354137add2088ddcce8731c389fc5c20734aad`
- GLB livré : `9d63c56e7e54631e0cd0931c44cc2647afbe09c92363942fcfd5e2c7882aa478`

## Limites

Le percentile 95 des ratios d'arêtes multi-os atteint 97,41 % et le maximum 781,38 %. Ces ratios viennent des petits segments situés dans les zones articulaires ou les couches de vêtements et ne sont pas soumis au seuil de 1 % réservé aux arêtes rigides. Ils ne sont pas supprimés du rapport : les captures à 0/20/45/80/100 % servent à examiner leur conséquence visuelle.

La distance au manche utilise les sommets de la main basse définition et une capsule ajustée au manche ; elle ne prouve pas l'enroulement des doigts. La collision repose sur un proxy BVH/plus proche surface. Ces limites de mesure n'impliquent aucune validation artistique.

## Vérification Komorebi

`app/app-verification.json` confirme : asset livré chargé, `Digging` embarqué, 23 os, 40 objets de rendu V0.44, aucun message JavaScript, main droite et pelle effectivement animées. Les captures demandées et la comparaison avant/après sont dans `captures/`.
