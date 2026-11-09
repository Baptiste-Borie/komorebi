"""Komorebi V0.52 — surgical polish of the ORIGINAL V0.44 gardener.

Only two visual changes:
  * A raised, fuller shoulder-to-sleeve junction (both sides).
  * Stop exposed arm skin piercing the sleeve fold (both sides).

Everything else — meshes, hat, head, hands, legs, boots and original rig/actions — is
loaded from the committed V0.44 editable .blend and left in place.
Run from repository root: blender -b --python-exit-code 1 --python scripts/blender/polish_gardener_v052.py
"""
from pathlib import Path
import bpy
import json
import math

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/characters/gardener-v044.blend'
DEST_BLEND = ROOT / 'assets/characters/gardener-v052.blend'
DEST_GLB = ROOT / 'public/assets/gardener-v052.glb'
REPORT = ROOT / 'reviews/character-lab/v052/asset-report.json'
if not SOURCE.is_file():
    raise RuntimeError('Modèle original V0.44 introuvable : ' + str(SOURCE))

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = 0
model = bpy.data.collections.get('GARDENER • editable surfaces')
rig = bpy.data.objects.get('KomorebiRig')
root = bpy.data.objects.get('Gardener_STATIC')
if model is None or rig is None or root is None or rig.type != 'ARMATURE':
    raise RuntimeError('V0.44 invalide : collection ou rig manquant')

def mesh(name):
    obj = bpy.data.objects.get(name)
    if obj is None or obj.type != 'MESH' or name not in model.objects:
        raise RuntimeError('Maillage original manquant : ' + name)
    return obj

def smooth(a, b, x):
    t = max(0.0, min(1.0, (x-a)/(b-a)))
    return t*t*(3.0-2.0*t)

shirt = mesh('Shirt • shaped shoulder and torso mesh')
sleeves = [mesh('Sleeve 1'), mesh('Sleeve -1')]
cuffs = [mesh('Folded cuff 1'), mesh('Folded cuff -1')]
arms = [mesh('Arm L • KayKit hand and continuous forearm'),
        mesh('Arm R • mirrored continuous forearm')]

# Keep the real V0.44 skin, clothes and all original rig weights.
# Moving fabric to overlap the torso gives a true sewn-in sleeve silhouette,
# rather than adding a spherical shoulder on top of the existing meshes.
counts = {'shirt_shoulder': 0, 'sleeve_shoulder': 0, 'arm_hidden': 0,
          'cuff_fit': 0, 'recolored_hidden_skin_faces': 0}
for v in shirt.data.vertices:
    p = v.co
    side = smooth(.23, .33, abs(p.x))
    high = smooth(.94, 1.04, p.z) * (1.0-smooth(1.14,1.19,p.z))
    amount = side*high
    if amount > .005:
        p.x += math.copysign(.014*amount, p.x)
        p.z += .010*amount
        counts['shirt_shoulder'] += 1
shirt.data.update()

for sleeve in sleeves:
    for v in sleeve.data.vertices:
        p = v.co
        # Upper sleeve roots rise and tuck farther underneath the shirt.
        # The bottom opening remains near its historical position.
        upper = smooth(.935, 1.068, p.z)
        inner = 1.0 - smooth(.31, .47, abs(p.x))
        effect = upper*(.60 + .40*inner)
        if effect > .005:
            p.z += .038*effect
            p.x -= math.copysign(.020*effect, p.x)
            # Fuller underside where the original armpit pinched too sharply.
            p.y = -.02 + (p.y+.02)*(1.0 + .037*effect)
            counts['sleeve_shoulder'] += 1
    sleeve.data.update()

# The salmon patch in V0.44 is actual forearm skin cutting THROUGH the linen
# sleeve, above the folded trim. Hide the skin underneath rather than putting
# yet another visible cloth layer on top.
linen = bpy.data.materials.get('Shirt • warm linen')
if linen is None:
    raise RuntimeError('Matériau textile V0.44 introuvable')
for arm in arms:
    for v in arm.data.vertices:
        p = v.co
        cover = smooth(.88, .965, p.z)
        if cover > .001:
            # Shrink only the fabric-covered part around its own limb axis.
            # Forearms, wrists and hands beneath z=.88 stay unchanged.
            axis_x = math.copysign(.425, p.x)
            p.x = axis_x + (p.x-axis_x)*(1.0-.16*cover)
            p.y = -.018+(p.y+.018)*(1.0-.16*cover)
            p.z += .014*cover
            counts['arm_hidden'] += 1
    arm.data.update()
    linen_slot = next((i for i,m in enumerate(arm.data.materials) if m==linen), None)
    if linen_slot is None:
        arm.data.materials.append(linen)
        linen_slot=len(arm.data.materials)-1
    # Safety net: even if a few skin polygons remain visible THROUGH the
    # cuff in animated frames, they read as undersleeve, not a bare-skin tear.
    for poly in arm.data.polygons:
        center_z = sum(arm.data.vertices[i].co.z for i in poly.vertices)/len(poly.vertices)
        if center_z >= .96:
            poly.material_index=linen_slot
            counts['recolored_hidden_skin_faces']+=1

# A very small move of the real rolled edge keeps it snug against the sleeve
# after the shoulder repositioning; no extra garment mesh is created.
for cuff in cuffs:
    verts = cuff.data.vertices
    cx=sum(v.co.x for v in verts)/len(verts)
    cy=sum(v.co.y for v in verts)/len(verts)
    for v in verts:
        p=v.co
        p.x=cx+(p.x-cx)*1.010
        p.y=cy+(p.y-cy)*1.025
        p.z+=.004
        counts['cuff_fit']+=1
    cuff.data.update()

if min(counts['shirt_shoulder'], counts['sleeve_shoulder'], counts['arm_hidden'],
       counts['cuff_fit'], counts['recolored_hidden_skin_faces']) < 4:
    raise RuntimeError('Topologie inattendue : retouches V0.52 interrompues : '+str(counts))
for obj in [shirt, *sleeves, *cuffs, *arms]:
    for vert in obj.data.vertices:
        if not all(math.isfinite(v) for v in vert.co):
            raise RuntimeError('Coordonnée non finie dans '+obj.name)

root['version'] = '0.52'
root['notes'] = 'Original V0.44 only: raised shoulder join and fix skin piercing linen sleeves'
rig['rig_version'] = '0.44 — existing action rig retained, animation pass next'
DEST_BLEND.parent.mkdir(parents=True, exist_ok=True)
DEST_GLB.parent.mkdir(parents=True, exist_ok=True)
REPORT.parent.mkdir(parents=True, exist_ok=True)

# Export original NLA actions: Dig, Fill, Level.
if not rig.animation_data or len(rig.animation_data.nla_tracks) < 3:
    raise RuntimeError('Actions originales V0.44 absentes; export annulé')
for track in rig.animation_data.nla_tracks:
    track.mute = False
bpy.context.scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for obj in model.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = rig
opts=dict(filepath=str(DEST_GLB),export_format='GLB',use_selection=True,
          export_animations=True, export_cameras=False,export_lights=False,export_extras=True)
export_properties = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
if 'export_animation_mode' in export_properties:
    opts['export_animation_mode'] = 'NLA_TRACKS'
else:
    opts['export_nla_strips'] = True
bpy.ops.export_scene.gltf(**opts)
if not DEST_GLB.is_file() or DEST_GLB.stat().st_size < 50000:
    raise RuntimeError('GLB V0.52 incomplet')
for track in rig.animation_data.nla_tracks:
    track.mute = True
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(DEST_BLEND),compress=True)
report={'version':'0.52','base':'gardener-v044.blend',
        'description':'Two surgical clothing/shoulder corrections; original rig retained',
        'rig_bones':len(rig.data.bones),
        'animations':[t.name for t in rig.animation_data.nla_tracks],
        'changes':counts,'glb_bytes':DEST_GLB.stat().st_size}
REPORT.write_text(json.dumps(report,indent=2)+'\n')
print('KOMOREBI_V052_OK',json.dumps(report))
