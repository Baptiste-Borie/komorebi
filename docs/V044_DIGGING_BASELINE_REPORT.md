# Digging v044 — arrêt au contrôle des références

> Actualisation : le [diagnostic des contacts](DIGGING_CONTACT_DIAGNOSIS.md) montre que les 5,14 % H ne prouvent pas un défaut de contact de Digging. Ce rapport historique décrit le montage et le critère initiaux ; sa conclusion sur la nécessité d’un clip corrigé est remplacée par le nouveau diagnostic. Les mesures originales restent conservées.

Branche : `gardener-v044-digging`. Base : `5dda097`. Sources du personnage inchangées.
Blender 5.2.2 LTS ; Three.js installé dans le projet. Action : `Digging`, 1,4 s.
143 instants mesurés par modèle : 101 échantillons uniformes et les temps des clés natives (sans arrondir leur durée).
Le contrôle glTF indépendant utilise 101 instants dans Three.js.

**Le banc n'est pas validé : le Ranger ne passe pas. La v051 échoue aussi.**
Aucune solution de rigging v044 n'a été produite et aucune itération de solution n'a été entamée (0/15).
L'étape 3 reste suspendue au prérequis de l'étape 2. Les captures jointes montrent les références, pas un jardinier final.

| Mesure | Ranger | v051 | Seuil |
|---|---:|---:|---:|
| Écart maximal du scale à 1 | 0.0000049 | 0.0000049 | 0,00001 |
| Variation absolue des arêtes hors jonctions | 51.188 % | 205.698 % | 1 % |
| Erreur maximale de la prise gauche | 5.144 % | 5.055 % | 0,5 % de H |
| Déplacement maximal des semelles sur le cycle | 0.902 % | 0.886 % | 0,5 % de H |
| Pénétration maximale des semelles | 0.013 % | 0.013 % | 0,1 % de H |
| Écart lame–sol au point le plus bas (provisoire) | 0.883 % | 0.868 % | 0,5 % de H |
| Paires avec nouvelle collision majeure (proxy) | 4 | 8 | 0 |

`H` est la hauteur du modèle au repos. L'origine du sol est fixée une fois par modèle ; aucun recalage animé.
La main droite porte rigidement l'outil et passe par construction. Le test utile est la seconde main : un point matériel fixe sur le manche est défini au premier instant du Ranger et réutilisé à l'identique sur la v051.

## Cause confirmée indépendamment

Three.js mesure une erreur de prise gauche de 5.144 % sur le Ranger et 5.055 % sur la v051.
L'écart entre les deux moteurs reste inférieur à 0,0001 H. Le problème ne dépend donc pas du seul import Blender.
Sur le Ranger, la distance entre les deux origines `handslot` varie de 5.449 % à 11.231 % de H.
Ces marqueurs ne restent pas aux deux mêmes points d'un outil rigide sur le cycle.

Un ajustement supplémentaire par moindres carrés autorisant deux offsets fixes libres laisse un résidu maximal de 3.175 % et un RMS de 1.894 % sur le Ranger.
Cet ajustement diagnostique n'est ni une preuve d'optimum minimax ni une animation corrigée ; il montre qu'un simple changement d'offset par moindres carrés ne suffit pas.

## Portée et limites du banc

- Les sommets mesurés sont ceux de la peau réellement évaluée par Blender. La référence d'arête est la pose de repos, et le critère mesure aussi la compression.
- Les jonctions sont des sections cylindriques fixes : demi-largeur axiale 0,04 H ; rayon 0,20 H au torse, 0,10 H aux épaules, 0,07 H aux autres articulations. Le nombre d'arêtes testées par mesh figure dans chaque JSON. Les masques n'utilisent pas les erreurs observées.
- Les meshes orphelins présents dans le GLB v051 sont exclus : seule la scène glTF active est mesurée et rendue, comme dans Three.js.
- Le déplacement des semelles porte sur le cycle entier. Les phases d'appui ne sont pas encore annotées : ce résultat est conservateur et ne certifie pas à lui seul un glissement pendant un appui.
- Les collisions utilisent des intersections BVH et une estimation de profondeur par surface proche, avec comparaison au repos et seuil de surface. Elles nécessitent une revue des cas signalés ; ce n'est pas un calcul exact de pénétration de solides. L'outil diagnostique n'est pas inclus dans les collisions entre pièces du personnage.
- L'outil est un montage diagnostique rigide, calibré une fois sur les prises initiales du Ranger. Il ne constitue pas une validation de la pelle historique de l'atelier, ni de la pelle v044 finale.
- L'instant de coup n'est pas encore annoté indépendamment. Le contrôle lame–sol utilise le point le plus bas du cycle : son résultat est provisoire et ne peut pas certifier une solution finale.
- Les rendus Workbench sont des diagnostics de pose ; les textures du Ranger ne sont pas restituées. Ils ne servent pas à valider le style final.

## Décision et suite nécessaire

Les seuils sont ceux proposés avant les mesures. Ils n'ont pas été ajustés pour faire passer le Ranger.
Le contrat « Ranger brut passe tous les tests » n'est pas vérifié, même sur le contrôle indépendant de prise.
Conformément au plan validé, arrêt avant le rigging v044 : corriger le jardinier ne résoudrait pas l'échec de la référence exigée.

Pour poursuivre sans relâcher les exigences, il faut établir une référence **corrigée et explicitement distincte** du clip KayKit brut : prises à deux mains, appuis et impact annoté, puis revalider le banc.
Le clip brut et les mesures présentes doivent rester conservés. Une correction de référence ne devra jamais être présentée comme un passage du Ranger original.

## Reproduire

Depuis la racine de la branche (dépendances Node du projet installées) :

```sh
blender -b --factory-startup --python-exit-code 1 --python scripts/blender/verify_digging.py -- --render --output reviews/digging-measures
node scripts/check_digging_gltf.mjs
python3 scripts/report_digging_baselines.py
```

Le premier processus retourne **2**, résultat attendu de rejet des références ; une erreur d'exécution retourne 1.
`--render` peut être omis pour ne recalculer que les mesures. Ne pas appeler les scripts `auto_push`.

## Livrables de diagnostic

- [Galerie locale avec courbes et 30 captures](../reviews/digging-measures/index.html).
- [Résumé](../reviews/digging-measures/summary.json).
- [Mesures Ranger](../reviews/digging-measures/ranger/report.json) et [CSV](../reviews/digging-measures/ranger/frames.csv).
- [Mesures v051](../reviews/digging-measures/v051/report.json) et [CSV](../reviews/digging-measures/v051/frames.csv).
- [Contrôle indépendant glTF](../reviews/digging-measures/gltf-cross-check.json).
- 15 captures par référence : 0/20/45/80/100 %, face/profil/trois quarts.
