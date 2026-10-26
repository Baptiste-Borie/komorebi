"""Build phase measurements, temporal SVG plots and a qualified diagnosis."""
import gzip
import html
import json
from pathlib import Path

import numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'reviews/digging-contact-diagnostic'
analysis=json.loads((OUT/'analysis.json').read_text())
native=json.load(gzip.open(OUT/'native-samples.json.gz','rt'))
H=analysis['height'];configs=analysis['configs'];reference=configs['legacy_pitch_175']


def pc(x):return f'{x*100:.4f} % H'
def maximum(config,key):return configs[config]['summary'][key]['max_H']
def mat(a):return np.array(a).reshape(4,4,order='F')


phases=[]
definitions=[(0,.33333333,'Descente / appui apparent','La main gauche descend sur le manche ; mouvement compatible avec un coulissement. La main droite conserve sa relation rigide avec le repère de pelle.'),
             (.33333333,.83333333,'Relevage / bascule','La pelle se relève et bascule ; la main gauche pivote et se rapproche de la main haute. Une prise matérielle strictement fixe n’est pas conservée.'),
             (.83333333,1.400001,'Retour / remise en position','Retour continu vers la pose initiale ; la main gauche reprend sa position et son orientation initiales, sans saut de pose ni ouverture visible.')]
for start,end,name,observation in definitions:
    rows=[r for r in reference['rows'] if start<=r['time_s']<end]
    first=rows[0]['index'];last=rows[-1]['index']
    metrics={}
    for side,prefix in [('r','right'),('l','left')]:
        centers=[]
        for row in rows:
            sample=native['samples'][row['index']]
            inverse=np.linalg.inv(mat(sample['hands']['r']['slot_matrix']))
            c=np.array(sample['hands'][side]['surface_vertices']).mean(axis=0)
            centers.append((inverse@np.r_[c,1])[:3])
        centers=np.array(centers)
        metrics[side]={'max_centroid_drift_from_phase_start_H':float(np.linalg.norm(centers-centers[0],axis=1).max()/H),
                       'axial_centroid_range_H':float(np.ptp([r[f'{prefix}_hand_centroid_axial_coordinate_H'] for r in rows])),
                       'max_surface_shaft_gap_H':max(r[f'{prefix}_surface_shaft_gap_H'] for r in rows),
                       'max_slot_reference_error_H':max(r[f'{prefix}_reference_error_H'] for r in rows),
                       'first_centroid_local':centers[0].tolist(),
                       'last_centroid_local':centers[-1].tolist()}
    phases.append({'name':name,'start_s':start,'end_s':min(end,analysis['duration_s']),
        'first_index':first,'last_index':last,'samples':len(rows),'observation':observation,'metrics':metrics,
        'source_authored_contact_annotation':False,
        'right_interpretation':'Fixed dominant grip is supported by the rigid hand-bone/tool relationship.',
        'left_interpretation':'Sliding/pivoting contact is compatible with the poses; deliberate release or discrete regrip is not established.',
        'contact_intention_certainty':'Visual/kinematic hypothesis; no source tool or author contact labels.'})
assert sum(p['samples'] for p in phases)==143
(OUT/'phases.json').write_text(json.dumps(phases,indent=2)+'\n')


def chart():
    chunks=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1180" viewBox="0 0 1200 1180"><rect width="1200" height="1180" fill="#fafaf7"/><style>text{font-family:DejaVu Sans,sans-serif;font-size:14px;fill:#26352f}.title{font-size:19px;font-weight:bold}</style>']
    panels=[
        ('Point fixe et main réelle : mesures distinctes',6,
         [('baseline_synthetic','historical_fixed_marker_error_H','#bd4e30','Marqueur G → référence fixe initiale'),('legacy_pitch_175','left_hand_centroid_fixed_reference_error_H','#206e9d','Centre géométrique G → référence initiale'),('legacy_pitch_175','right_hand_centroid_fixed_reference_error_H','#348258','Centre géométrique D → référence initiale')],True),
        ('Distance minimale main → volume du manche : montage initial',7.5,
         [('baseline_synthetic','right_surface_shaft_gap_H','#bd4e30','Synthétique : main D'),('baseline_synthetic','left_surface_shaft_gap_H','#206e9d','Synthétique : main G'),('legacy_zero_pitch','left_surface_shaft_gap_H','#ae7d16','Atelier 0° : main G')],True),
        ('Même clip, montage fixe 175° : proximité géométrique seulement',.8,
         [('legacy_pitch_175','right_surface_shaft_gap_H','#bd4e30','Main D'),('legacy_pitch_175','left_surface_shaft_gap_H','#206e9d','Main G')],True),
        ('Coordonnée axiale du centre de main G : coulissement compatible',45,
         [('legacy_pitch_175','left_hand_centroid_axial_coordinate_H','#206e9d','Position le long du manche / H')],False),
    ]
    for panel,(title,ymax,curves,threshold) in enumerate(panels):
        top=panel*285+45;left=90;width=1010;height=165
        chunks.append(f'<text x="30" y="{top-20}" class="title">{html.escape(title)}</text>')
        for phase,color in zip(phases,['#e9e9dc','#dcebe8','#e9e0db']):
            x=left+phase['start_s']/1.4*width;w=(phase['end_s']-phase['start_s'])/1.4*width
            chunks.append(f'<rect x="{x}" y="{top}" width="{w}" height="{height}" fill="{color}"/>')
        for fraction in (0,.25,.5,.75,1):
            y=top+height*(1-fraction)
            chunks.append(f'<path d="M{left} {y} H{left+width}" stroke="#ccc"/><text x="25" y="{y+5}">{ymax*fraction:.2f}%</text>')
        for t in (0,.2,.4,.6,.8,1,1.2,1.4):
            x=left+t/1.4*width
            chunks.append(f'<text x="{x-12}" y="{top+height+22}">{t:.1f}s</text>')
        if threshold:
            y=top+height-.5/ymax*height
            chunks.append(f'<path d="M{left} {y} H{left+width}" stroke="#8d2433" stroke-width="2" stroke-dasharray="5 5"/><text x="{left+width-130}" y="{y-6}">Seuil 0,5 % H</text>')
        for j,(config,key,color,label) in enumerate(curves):
            points=' '.join(f"{left+r['time_s']/1.4*width:.2f},{top+height-r[key]*100/ymax*height:.2f}" for r in configs[config]['rows'])
            chunks.append(f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="{3-j*.5}"/>')
            chunks.append(f'<text x="{left+j*340}" y="{top+height+48}" style="fill:{color};font-size:12px">{html.escape(label)}</text>')
    chunks.append('<text x="35" y="1160">143 instants originaux. Bandes : descente / relevage / retour. Zéro peut signaler une intersection ; ce n’est pas une validation de prise.</text></svg>')
    return ''.join(chunks)


(OUT/'temporal.svg').write_text(chart())
legacy=configs['legacy_zero_pitch']['summary']['left_surface_shaft_gap_H']
historical=configs['baseline_synthetic']['summary']['historical_fixed_marker_error_H']
left_angle=max(r['left_hand_relative_rotation_deg'] for r in reference['rows'])
table='| Phase observée | Instants | Main droite | Main gauche | Variation axiale du centre G |\n|---|---|---|---|---:|\n'
for p in phases:
    table+=f"| {p['name']} | {p['start_s']:.6f}–{p['end_s']:.6f} s ; {p['samples']} échantillons | Relation outil/main rigide | Coulissement / pivot compatibles ; pas de relâchement établi | {pc(p['metrics']['l']['axial_centroid_range_H'])} |\n"
doc=f'''# Digging — diagnostic des contacts du Ranger original

**Conclusion : les 5,14 % H ne démontrent pas un défaut de contact de l’animation originale. La nécessité de corriger le clip n’est pas établie.** Le banc historique mélangeait une hypothèse de prise fixe et un montage de pelle inadéquat. Il faut d’abord corriger la définition du contact et le montage de l’outil.

Cette conclusion remplace l’affirmation précédente selon laquelle un clip corrigé était nécessaire. Elle ne signifie pas que tous les tests physiques du Ranger passent : étirement, pieds, collisions et impact restent des questions séparées. Aucun seuil n’a été modifié ; le seuil de contact reste **0,005 H**. Aucun rigging v044 et aucun clip dérivé n’ont été créés.

## Sources et méthode

- Ranger et `Rig_Medium_Tools / Digging` : mêmes SHA-256 que le premier diagnostic, enregistrés dans `analysis.json`. Clip original de {analysis['duration_s']:.9f} s ; hauteur native H = {H:.9f}.
- Le fichier Tools contient un mannequin et ses actions, **aucune pelle ni annotation de prise/relâchement**. Les 23 os n’animent pas les doigts. L’intention exacte de l’auteur ne peut donc pas être déterminée avec certitude à partir de ce seul fichier.
- Les **143 instants exactement repris du CSV précédent** sont évalués dans Three.js, en coordonnées glTF natives, sans normalisation par pose et sans modification des courbes.
- Une main géométrique est le sous-ensemble de triangles dont les trois sommets ont un poids `hand` ≥ 0,5 : 193 triangles par côté. La sélection exclut l’avant-bras ; elle est documentée et reproductible, sans sélection basée sur l’erreur.
- Le centre géométrique est la moyenne de ces sommets : c’est un repère de suivi, pas une paume ni une annotation de prise de l’auteur. Les origines `handslot` et `hand` sont aussi mesurées séparément.
- Distance au manche : distance minimale des triangles de la main au **volume d’une capsule finie** représentant le manche, rayon indiqué pour chaque configuration. La formule segment–triangle est vérifiée sur des cas analytiques et 12 cas comparés à un solveur convexe indépendant. La capsule arrondit les extrémités ; le manche de l’atelier est légèrement tronconique. Son rayon conservateur de 0,03 est conservé pour toutes les orientations de l’atelier. Les témoins les plus proches sont fournis dans le JSON. Sur le montage synthétique, la main D est au-delà d’une extrémité : la distance capsule est une borne inférieure de l’écart au cylindre à fond plat. Sur l’atelier, les témoins sont dans la partie intérieure du manche.
- **Distance nulle signifie proximité ou intersection**, et ne valide ni l’enroulement des doigts ni une absence de pénétration. Elle ne suffit pas pour faire passer un test final de prise.
- Les nouvelles captures utilisent les sommets évalués figés pour chaque pose, sans réutiliser les anciens rendus Workbench. La concordance des origines de mains et sockets Blender/glTF est contrôlée à 0,0001 H ; la valeur maximale observée est dans `captures.json`.

## Diagnostic par phase

Ces phases sont une **lecture visuelle et cinématique du geste**, avec frontières proches du bas de la descente et de la fin du relevage. Elles ne sont pas des événements de contact fournis par KayKit et ne sont pas choisies pour masquer les dépassements. Chaque échantillon appartient à une seule phase.

{table}

La main D garde une transformation constante par rapport à `handslot.r` pendant tout le cycle : dérive du repère d’os {pc(maximum('legacy_pitch_175','right_hand_bone_fixed_reference_error_H'))}. Le centre du mesh varie de {pc(maximum('legacy_pitch_175','right_hand_centroid_fixed_reference_error_H'))} au maximum à cause de la peau et du choix du centre.

La main G ne reste pas sur un même point matériel. Son centre se déplace de {pc(maximum('legacy_pitch_175','left_hand_centroid_fixed_reference_error_H'))} par rapport à sa référence initiale rigidement attachée à l’outil. Son orientation relative varie jusqu’à {left_angle:.3f}°. La combinaison translation axiale + pivot est compatible avec un geste de creusement stylisé à deux mains. Les poses ne montrent pas d’ouverture nette ni de changement discret de prise. **Aucune phase de détachement intentionnel n’est établie**, et aucune n’a été exclue des mesures.

Ainsi, la classification justifiée est : D fixe tout le cycle ; G coulissement/pivot compatibles tout le cycle, avec une intention de contact continu plausible mais non confirmée par l’auteur. Affirmer « G est intentionnellement relâchée de t₁ à t₂ » serait inventer une information absente.

## Ce que mesurait réellement 5,14 % H

Le banc définissait `pG_ref = inverse(M_socketD(0)) × p_socketG(0)` et mesurait `||M_socketD(t) × pG_ref − p_socketG(t)|| / H`. C’est une erreur de **point matériel fixe**, pas une distance main–manche. Un glissement le long du manche, une rotation autour du manche et un décollage peuvent tous l’augmenter.

Maximum historique : **{pc(historical['max_H'])}**, à **{historical['max_time_s']:.8f} s**. Dépassement sur **129/143 instants**, du premier échantillon à **0,05599999745686848 s** au dernier à **1,3159999402364093 s**. La liste exacte des instants est dans les CSV et les lignes JSON, pas seulement dans un graphique.

Les franchissements continus sont encadrés par [0,04199999809265136 ; 0,05599999745686848] s et [1,3159999402364093 ; 1,3299999396006266] s. Les interpolations {historical['exceedances'][0]['linear_entry_estimate_s']:.9f} s et {historical['exceedances'][0]['linear_exit_estimate_s']:.9f} s sont des **estimations**, pas des événements évalués exactement. Le JSON distingue ces quantités.

## Effet du montage initial, de l’orientation et de l’attachement

| Montage fixe, même animation | Écart maximal surface main D → manche | Main G → manche | Lecture |
|---|---:|---:|---|
| Synthétique du banc initial | {pc(maximum('baseline_synthetic','right_surface_shaft_gap_H'))} | {pc(maximum('baseline_synthetic','left_surface_shaft_gap_H'))} | Le manche ne rejoint pas la main haute. Le zéro D initial était imposé au socket, sans mesurer la main. |
| Pelle de l’atelier, 0° | {pc(maximum('legacy_zero_pitch','right_surface_shaft_gap_H'))} | {pc(maximum('legacy_zero_pitch','left_surface_shaft_gap_H'))} | Faible séparation G au retour, lame du côté de la main haute. |
| Même manche, −5° | {pc(maximum('legacy_pitch_-5','right_surface_shaft_gap_H'))} | {pc(maximum('legacy_pitch_-5','left_surface_shaft_gap_H'))} | Le changement de montage suffit à supprimer le seuil de séparation, sans éditer le clip. Lame encore du mauvais côté pour la lecture retenue. |
| Même pelle retournée, 180° | {pc(maximum('legacy_pitch_180','right_surface_shaft_gap_H'))} | {pc(maximum('legacy_pitch_180','left_surface_shaft_gap_H'))} | Lame du côté de la main basse ; la séparation au retour reste. |
| Même pelle retournée et inclinée, 175° | {pc(maximum('legacy_pitch_175','right_surface_shaft_gap_H'))} | {pc(maximum('legacy_pitch_175','left_surface_shaft_gap_H'))} | Les deux mains restent à proximité du manche sur les 143 instants ; ce n’est pas une certification de prise saine. |

Le montage synthétique était orienté à partir de la ligne entre les deux **sockets initiaux**, puis raccourci côté main haute. Or un socket n’est pas le centre de la main : l’origine de l’os `hand.r` se trouve à environ 0,409 unité du socket dans cette pose animée. L’erreur D du banc était nulle par construction alors que le manche pouvait être hors de portée de la main réelle. L’attachement rigide à droite n’est pas à lui seul fautif ; le repère, le sens et l’étendue du manche étaient mal interprétés.

Pour la pelle d’atelier à 0°, le dépassement de distance minimale G concerne **9 instants**, entre **{legacy['exceedances'][0]['first_sample_s']:.12f}** et **{legacy['exceedances'][0]['last_sample_s']:.12f} s** ; maximum **{pc(legacy['max_H'])} à {legacy['max_time_s']:.8f} s**. Les encadrements et estimations de franchissement sont fournis dans `analysis.json`. Le même intervalle est mesuré, sans exclusion, dans les configurations inclinées : le dépassement disparaît.

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
'''
(ROOT/'docs/DIGGING_CONTACT_DIAGNOSIS.md').write_text(doc)
print('Phase report and temporal SVG written; 143 samples partitioned without exclusions.')
