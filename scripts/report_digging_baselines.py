"""Build a standalone local review from measured Blender and glTF reports."""
import csv
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'reviews/digging-measures'
reports = {name: json.loads((OUT/name/'report.json').read_text()) for name in ('ranger','v051')}
cross = {r['name']: r for r in json.loads((OUT/'gltf-cross-check.json').read_text())}
for name,report in reports.items():
    assert abs(report['maxima']['grip_left_H']-cross[name]['maximum_marker_error_H']) < 1e-4, 'Blender/glTF mismatch'
    expected = {f'{p:03d}-{v}.png' for p in (0,20,45,80,100) for v in ('face','profil','trois-quarts')}
    assert expected == {p.name for p in (OUT/name).glob('*.png')}, 'Missing review images'

def percent(x): return f'{100*x:.3f} %'
def record(label, getter, threshold):
    return [label,*[getter(reports[name]) for name in reports],threshold]

rows = [
    record('Écart maximal du scale à 1',lambda r:f"{r['maxima']['scale']:.7f}",'0,00001'),
    record('Variation absolue des arêtes hors jonctions',lambda r:percent(r['maxima']['edge_strain']),'1 %'),
    record('Erreur maximale de la prise gauche',lambda r:percent(r['maxima']['grip_left_H']),'0,5 % de H'),
    record('Déplacement maximal des semelles sur le cycle',lambda r:percent(max(r['maxima']['foot_left_slide_H'],r['maxima']['foot_right_slide_H'])),'0,5 % de H'),
    record('Pénétration maximale des semelles',lambda r:percent(r['ground_penetration_H']),'0,1 % de H'),
    record('Écart lame–sol au point le plus bas (provisoire)',lambda r:percent(abs(r['tentative_strike']['blade_min_z_H'])),'0,5 % de H'),
    record('Paires avec nouvelle collision majeure (proxy)',lambda r:str(r['maxima']['major_collision_pairs']),'0'),
]
table='| Mesure | Ranger | v051 | Seuil |\n|---|---:|---:|---:|\n'+'\n'.join('| '+' | '.join(row)+' |' for row in rows)
doc=f'''# Digging v044 — arrêt au contrôle des références

> Actualisation : le [diagnostic des contacts](DIGGING_CONTACT_DIAGNOSIS.md) montre que les 5,14 % H ne prouvent pas un défaut de contact de Digging. Ce rapport historique décrit le montage et le critère initiaux ; sa conclusion sur la nécessité d’un clip corrigé est remplacée par le nouveau diagnostic. Les mesures originales restent conservées.

Branche : `gardener-v044-digging`. Base : `5dda097`. Sources du personnage inchangées.
Blender 5.2.2 LTS ; Three.js installé dans le projet. Action : `Digging`, 1,4 s.
143 instants mesurés par modèle : 101 échantillons uniformes et les temps des clés natives (sans arrondir leur durée).
Le contrôle glTF indépendant utilise 101 instants dans Three.js.

**Le banc n'est pas validé : le Ranger ne passe pas. La v051 échoue aussi.**
Aucune solution de rigging v044 n'a été produite et aucune itération de solution n'a été entamée (0/15).
L'étape 3 reste suspendue au prérequis de l'étape 2. Les captures jointes montrent les références, pas un jardinier final.

{table}

`H` est la hauteur du modèle au repos. L'origine du sol est fixée une fois par modèle ; aucun recalage animé.
La main droite porte rigidement l'outil et passe par construction. Le test utile est la seconde main : un point matériel fixe sur le manche est défini au premier instant du Ranger et réutilisé à l'identique sur la v051.

## Cause confirmée indépendamment

Three.js mesure une erreur de prise gauche de {percent(cross['ranger']['maximum_marker_error_H'])} sur le Ranger et {percent(cross['v051']['maximum_marker_error_H'])} sur la v051.
L'écart entre les deux moteurs reste inférieur à 0,0001 H. Le problème ne dépend donc pas du seul import Blender.
Sur le Ranger, la distance entre les deux origines `handslot` varie de {percent(cross['ranger']['inter_hand_distance_range_H'][0])} à {percent(cross['ranger']['inter_hand_distance_range_H'][1])} de H.
Ces marqueurs ne restent pas aux deux mêmes points d'un outil rigide sur le cycle.

Un ajustement supplémentaire par moindres carrés autorisant deux offsets fixes libres laisse un résidu maximal de {percent(reports['ranger']['fixed_marker_least_squares']['max_residual_H'])} et un RMS de {percent(reports['ranger']['fixed_marker_least_squares']['rms_residual_H'])} sur le Ranger.
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
'''
(ROOT/'docs/V044_DIGGING_BASELINE_REPORT.md').write_text(doc)

def chart(name):
    r=reports[name]
    frames=list(csv.DictReader((OUT/name/'frames.csv').open()))
    ymax=max(.006,max(float(x['grip_left_H']) for x in frames))*1.1
    def xy(x,y):return f'{50+float(x)*6:.1f},{230-float(y)/ymax*195:.1f}'
    line=' '.join(xy(row['percent'],row['grip_left_H']) for row in frames)
    threshold=230-.005/ymax*195
    return f'''<svg viewBox="0 0 700 270" role="img" aria-label="Erreur de prise gauche sur le cycle, {name}">
    <rect width="700" height="270" fill="white"/>
    <path d="M50 30 V230 H650" fill="none" stroke="#555"/>
    <path d="M50 {threshold} H650" stroke="#be3542" stroke-dasharray="6 4"/>
    <polyline points="{line}" fill="none" stroke="#256c66" stroke-width="2"/>
    <text x="50" y="20">Erreur prise gauche / H — {name}</text>
    <text x="54" y="{threshold-8}">Seuil 0,5 % H</text>
    <text x="7" y="45">{100*ymax:.1f}%</text><text x="30" y="234">0</text>
    <text x="50" y="255">0 %</text><text x="615" y="255">100 %</text></svg>'''

body='''<!doctype html><html lang="fr"><meta charset="utf-8"><title>Digging — diagnostic des références</title>
<style>body{font:16px/1.5 system-ui;color:#26352e;background:#f5f4ed;margin:32px auto;max-width:1200px;padding:0 20px}h1{font-size:30px}table{border-collapse:collapse;width:100%;background:white}th,td{text-align:left;border:1px solid #ddd;padding:10px}aside{border-left:5px solid #a84141;padding:12px;background:#fff}section{margin:40px 0}svg{max-width:700px;width:100%}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}img{width:100%}figure{margin:0}figcaption{font-size:13px}a{color:#215f58}</style>
<h1>Digging : le contrôle des références échoue</h1>
<aside><strong>Aucune solution v044 produite — 0/15 itérations.</strong><br>Ranger et v051 échouent. Ces captures sont des diagnostics de référence, avec une pelle synthétique et des matériaux Workbench. Le contact lame–sol et les appuis nécessitent encore une annotation indépendante.</aside>
<p>143 instants mesurés par modèle, plus un contrôle Three.js indépendant sur 101 instants. <a href="../../docs/V044_DIGGING_BASELINE_REPORT.md">Rapport complet et limites</a> · <a href="summary.json">Résumé JSON</a></p>
<table><thead><tr><th>Mesure</th><th>Ranger</th><th>v051</th><th>Seuil</th></tr></thead><tbody>'''
body+=''.join('<tr>'+''.join('<td>'+html.escape(value)+'</td>' for value in row)+'</tr>' for row in rows)
body+='</tbody></table>'
for name in reports:
    body+=f'<section><h2>{name}</h2>'+chart(name)+f'<p><a href="{name}/report.json">JSON détaillé</a> · <a href="{name}/frames.csv">CSV</a></p>'
    for percent_value in (0,20,45,80,100):
        body+=f'<h3>{percent_value} %</h3><div class="grid">'
        for view in ('face','profil','trois-quarts'):
            path=f'{name}/{percent_value:03d}-{view}.png'
            body+=f'<figure><a href="{path}"><img src="{path}" alt="{name}, {percent_value} %, {view}" loading="lazy"></a><figcaption>{view}</figcaption></figure>'
        body+='</div>'
    body+='</section>'
body+='</html>'
(OUT/'index.html').write_text(body)
print('Report built; Blender/glTF agreement and all 30 captures verified.')
