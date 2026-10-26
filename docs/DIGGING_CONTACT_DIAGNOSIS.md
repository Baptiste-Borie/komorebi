# Digging — diagnostic des contacts du Ranger original

**Conclusion : les 5,14 % H ne démontrent pas un défaut de contact de l’animation originale. La nécessité de corriger le clip n’est pas établie.** Le banc historique mélangeait une hypothèse de prise fixe et un montage de pelle inadéquat. Il faut d’abord corriger la définition du contact et le montage de l’outil.

Cette conclusion remplace l’affirmation précédente selon laquelle un clip corrigé était nécessaire. Elle ne signifie pas que tous les tests physiques du Ranger passent : étirement, pieds, collisions et impact restent des questions séparées. Aucun seuil n’a été modifié ; le seuil de contact reste **0,005 H**. Aucun rigging v044 et aucun clip dérivé n’ont été créés.

## Sources et méthode

- Ranger et `Rig_Medium_Tools / Digging` : mêmes SHA-256 que le premier diagnostic, enregistrés dans `analysis.json`. Clip original de 1.399999976 s ; hauteur native H = 2.274951563.
- Le fichier Tools contient un mannequin et ses actions, **aucune pelle ni annotation de prise/relâchement**. Les 23 os n’animent pas les doigts. L’intention exacte de l’auteur ne peut donc pas être déterminée avec certitude à partir de ce seul fichier.
- Les **143 instants exactement repris du CSV précédent** sont évalués dans Three.js, en coordonnées glTF natives, sans normalisation par pose et sans modification des courbes.
- Une main géométrique est le sous-ensemble de triangles dont les trois sommets ont un poids `hand` ≥ 0,5 : 193 triangles par côté. La sélection exclut l’avant-bras ; elle est documentée et reproductible, sans sélection basée sur l’erreur.
- Le centre géométrique est la moyenne de ces sommets : c’est un repère de suivi, pas une paume ni une annotation de prise de l’auteur. Les origines `handslot` et `hand` sont aussi mesurées séparément.
- Distance au manche : distance minimale des triangles de la main au **volume d’une capsule finie** représentant le manche, rayon indiqué pour chaque configuration. La formule segment–triangle est vérifiée sur des cas analytiques et 12 cas comparés à un solveur convexe indépendant. La capsule arrondit les extrémités ; le manche de l’atelier est légèrement tronconique. Son rayon conservateur de 0,03 est conservé pour toutes les orientations de l’atelier. Les témoins les plus proches sont fournis dans le JSON. Sur le montage synthétique, la main D est au-delà d’une extrémité : la distance capsule est une borne inférieure de l’écart au cylindre à fond plat. Sur l’atelier, les témoins sont dans la partie intérieure du manche.
- **Distance nulle signifie proximité ou intersection**, et ne valide ni l’enroulement des doigts ni une absence de pénétration. Elle ne suffit pas pour faire passer un test final de prise.
- Les nouvelles captures utilisent les sommets évalués figés pour chaque pose, sans réutiliser les anciens rendus Workbench. La concordance des origines de mains et sockets Blender/glTF est contrôlée à 0,0001 H ; la valeur maximale observée est dans `captures.json`.

## Diagnostic par phase

Ces phases sont une **lecture visuelle et cinématique du geste**, avec frontières proches du bas de la descente et de la fin du relevage. Elles ne sont pas des événements de contact fournis par KayKit et ne sont pas choisies pour masquer les dépassements. Chaque échantillon appartient à une seule phase.

| Phase observée | Instants | Main droite | Main gauche | Variation axiale du centre G |
|---|---|---|---|---:|
| Descente / appui apparent | 0.000000–0.333333 s ; 33 échantillons | Relation outil/main rigide | Coulissement / pivot compatibles ; pas de relâchement établi | 4.8234 % H |
| Relevage / bascule | 0.333333–0.833333 s ; 51 échantillons | Relation outil/main rigide | Coulissement / pivot compatibles ; pas de relâchement établi | 3.5465 % H |
| Retour / remise en position | 0.833333–1.400000 s ; 59 échantillons | Relation outil/main rigide | Coulissement / pivot compatibles ; pas de relâchement établi | 1.7663 % H |


La main D garde une transformation constante par rapport à `handslot.r` pendant tout le cycle : dérive du repère d’os 0.0000 % H. Le centre du mesh varie de 0.1446 % H au maximum à cause de la peau et du choix du centre.

La main G ne reste pas sur un même point matériel. Son centre se déplace de 4.8916 % H par rapport à sa référence initiale rigidement attachée à l’outil. Son orientation relative varie jusqu’à 27.513°. La combinaison translation axiale + pivot est compatible avec un geste de creusement stylisé à deux mains. Les poses ne montrent pas d’ouverture nette ni de changement discret de prise. **Aucune phase de détachement intentionnel n’est établie**, et aucune n’a été exclue des mesures.

Ainsi, la classification justifiée est : D fixe tout le cycle ; G coulissement/pivot compatibles tout le cycle, avec une intention de contact continu plausible mais non confirmée par l’auteur. Affirmer « G est intentionnellement relâchée de t₁ à t₂ » serait inventer une information absente.

## Ce que mesurait réellement 5,14 % H

Le banc définissait `pG_ref = inverse(M_socketD(0)) × p_socketG(0)` et mesurait `||M_socketD(t) × pG_ref − p_socketG(t)|| / H`. C’est une erreur de **point matériel fixe**, pas une distance main–manche. Un glissement le long du manche, une rotation autour du manche et un décollage peuvent tous l’augmenter.

Maximum historique : **5.1439 % H**, à **0.23333333 s**. Dépassement sur **129/143 instants**, du premier échantillon à **0,05599999745686848 s** au dernier à **1,3159999402364093 s**. La liste exacte des instants est dans les CSV et les lignes JSON, pas seulement dans un graphique.

Les franchissements continus sont encadrés par [0,04199999809265136 ; 0,05599999745686848] s et [1,3159999402364093 ; 1,3299999396006266] s. Les interpolations 0.046001610 s et 1.321459039 s sont des **estimations**, pas des événements évalués exactement. Le JSON distingue ces quantités.

## Effet du montage initial, de l’orientation et de l’attachement

| Montage fixe, même animation | Écart maximal surface main D → manche | Main G → manche | Lecture |
|---|---:|---:|---|
| Synthétique du banc initial | 6.6876 % H | 0.0000 % H | Le manche ne rejoint pas la main haute. Le zéro D initial était imposé au socket, sans mesurer la main. |
| Pelle de l’atelier, 0° | 0.0000 % H | 0.6816 % H | Faible séparation G au retour, lame du côté de la main haute. |
| Même manche, −5° | 0.0000 % H | 0.0000 % H | Le changement de montage suffit à supprimer le seuil de séparation, sans éditer le clip. Lame encore du mauvais côté pour la lecture retenue. |
| Même pelle retournée, 180° | 0.0000 % H | 0.6816 % H | Lame du côté de la main basse ; la séparation au retour reste. |
| Même pelle retournée et inclinée, 175° | 0.0000 % H | 0.0000 % H | Les deux mains restent à proximité du manche sur les 143 instants ; ce n’est pas une certification de prise saine. |

Le montage synthétique était orienté à partir de la ligne entre les deux **sockets initiaux**, puis raccourci côté main haute. Or un socket n’est pas le centre de la main : l’origine de l’os `hand.r` se trouve à environ 0,409 unité du socket dans cette pose animée. L’erreur D du banc était nulle par construction alors que le manche pouvait être hors de portée de la main réelle. L’attachement rigide à droite n’est pas à lui seul fautif ; le repère, le sens et l’étendue du manche étaient mal interprétés.

Pour la pelle d’atelier à 0°, le dépassement de distance minimale G concerne **9 instants**, entre **1.161999947230** et **1.233333350000 s** ; maximum **0.6816 % H à 1.20000005 s**. Les encadrements et estimations de franchissement sont fournis dans `analysis.json`. Le même intervalle est mesuré, sans exclusion, dans les configurations inclinées : le dépassement disparaît.

L’exploration fixe −15/−10/−5/0/5/10/15/175/180/185° est intégralement enregistrée. Elle sert à mesurer la sensibilité au montage ; **175° n’est pas présenté comme le montage officiel KayKit**, qui n’est pas livré. Ni la longueur de lame, ni l’impact au sol, ni les intersections main–outil ne sont validés par cette expérience. Le sens de la lame et ses dimensions doivent être calibrés avant d’utiliser un « instant de coup » comme preuve d’un défaut d’animation.

## Les trois catégories

1. **Défaut réel de l’animation originale : non établi pour les contacts.** Le mouvement relatif G est réel et le clip ne satisfait pas une contrainte arbitraire de prise fixe sur tout le cycle ; cela ne suffit pas à en faire un défaut. Aucun élément ne démontre un relâchement accidentel persistant quel que soit un montage raisonnable de l’outil. Les tests d’étirement, de pieds et de collisions du rapport précédent ne sont pas requalifiés ici.
2. **Configuration du banc : problèmes établis.** Sockets assimilés aux mains, zéro D imposé sans contrôle géométrique, outil synthétique mal étendu/orienté, lame d’atelier orientée côté main haute, erreur de point fixe interprétée comme distance au manche, absence d’annotations de contact. Ces erreurs invalident la conclusion « 5,14 % = décollage réel ».
3. **Mouvement compatible avec une intention : coulissement et pivot G**, D restant fixe. La continuité et les poses fermées ne permettent pas de prouver un changement de prise ou un détachement temporaire. Cette interprétation reste une hypothèse visuelle, pas une intention source certifiée.

## Critères de reprise et correction minimale conditionnelle

- Annoter **avant la validation** un état par main : `FIXE`, `GLISSE`, `LIBRE`, avec justification visuelle ou référence d’auteur. Ne jamais déduire `LIBRE` du seul fait qu’un seuil est dépassé. À ce stade, aucune plage `LIBRE` G n’est justifiée.
- `FIXE` : mesurer le déplacement d’un vrai repère de paume/prise calibré vers le même point matériel de l’outil et imposer ≤ 0,005 H, plus proximité au manche et contrôle de pénétration. Conserver le zéro par construction comme vérification d’attachement, pas comme preuve de contact.
- `GLISSE` : imposer la même tolérance de proximité au manche, une coordonnée axiale dans sa zone saisissable, une trajectoire continue et une orientation compatible avec la paume. Autoriser la variation axiale intentionnelle ; ne pas la compter comme un décollage. Les tolérances de pénétration et la région de paume doivent encore être définies géométriquement.
- `LIBRE` : suspendre uniquement la contrainte de contact sur l’intervalle explicitement annoté, puis vérifier le rétablissement de la prise à sa sortie. Aucune suspension de ce type n’a été appliquée ici.
- **Ne pas corriger les courbes de Digging sur la base de 5,14 % H.** Corriger d’abord le montage et choisir le comportement artistique attendu de G. Le montage fixe 175° est un témoin utile pour cette revue, sans constituer une version de production.
- Si une prise G strictement fixe est finalement exigée et qu’un décollage réel est confirmé après ce calibrage : créer un clip dérivé `Digging_contacts`, conserver l’original avec son hash, et appliquer une correction IK limitée au bras/poignet G pendant les phases annotées `FIXE`. Préserver les longueurs, scales unitaires, main D et geste du corps ; transitions progressives aux bornes. Ne pas figer tout le cycle ni déplacer les pieds pour masquer le défaut. Aucun clip dérivé n’est nécessairement indiqué par les mesures présentes et aucun n’a été créé.
- Pour la v044 : reprendre seulement après validation de la pelle, des repères de paume et des états de contact. La présente tâche ne commence pas son rigging. Conserver ensuite le corps et les vêtements v044, les pièces rigides sur un os et les poids mélangés aux jonctions, comme prévu.

## Reproduire et consulter

```sh
node scripts/dump_digging_contacts.mjs
python3 scripts/analyze_digging_contacts.py
blender -b --factory-startup --python-exit-code 1 --python scripts/blender/render_digging_contacts.py
python3 scripts/report_digging_contacts.py
node scripts/annotate_digging_contacts.mjs
```

Python : numpy et scipy ; Node : dépendances du projet dont `three` et `sharp` ; Blender 5.2.2 utilisé. Aucun accès réseau pendant ces mesures.

- [Graphique temporel SVG](../reviews/digging-contact-diagnostic/temporal.svg) et [PNG](../reviews/digging-contact-diagnostic/temporal.png).
- [Galerie annotée et curseur temporel](../reviews/digging-contact-diagnostic/index.html).
- [Diagnostic complet par configuration et instants de dépassement](../reviews/digging-contact-diagnostic/analysis.json).
- [Phases, variations et degré de certitude](../reviews/digging-contact-diagnostic/phases.json).
- [CSV du montage historique](../reviews/digging-contact-diagnostic/baseline_synthetic.csv), [atelier 0°](../reviews/digging-contact-diagnostic/legacy_zero_pitch.csv), [montage témoin 175°](../reviews/digging-contact-diagnostic/legacy_pitch_175.csv).
- Données glTF natives : `native-samples.json.gz` ; témoins 3D dans `analysis.json`, projections des captures dans `captures.json`. Les PNG `*-annotated.png` et SVG correspondants indiquent les maxima mesurés et les limites d’interprétation.
