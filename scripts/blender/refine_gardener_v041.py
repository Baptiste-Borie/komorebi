"""Komorebi V0.41 — silhouette clinic on top of V0.40, no new primitives.

Usage: blender -b --threads 6 --python-exit-code 1 --python scripts/blender/refine_gardener_v041.py
Only the STATIC character is exported; studio and rendering objects stay in .blend.
"""
import bpy
import bmesh
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'assets/characters/gardener-v040.blend'
OUT_BLEND = ROOT / 'assets/characters/gardener-v041.blend'
OUT_GLB = ROOT / 'public/assets/gardener-v041.glb'
REVIEW = ROOT / 'reviews/character-lab/v041'
if not BASE.is_file():
    raise RuntimeError('V0.41 : fichier source V0.40 manquant : ' + str(BASE))
for folder in (OUT_BLEND.parent, OUT_GLB.parent, REVIEW):
    folder.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(BASE))
bpy.context.preferences.filepaths.save_version = 0
model = bpy.data.collections.get('GARDENER • editable surfaces')
root = bpy.data.objects.get('Gardener_STATIC')
if not model or not root:
    raise RuntimeError('V0.41 : collection KayKit/Komorebi introuvable dans le .blend V0.40')

def mesh(name):
    obj = bpy.data.objects.get(name)
    if obj is None or obj.type != 'MESH' or name not in model.objects:
        raise RuntimeError('V0.41 : objet attendu introuvable : ' + name)
    return obj

face = mesh('Face and ears • adapted KayKit topology')
hair = mesh('Hair • short tapered tousled cap')
pants = mesh('Overalls • continuous waist seat crotch and legs')
shirt = mesh('Shirt • shaped shoulder and torso mesh')
arms = [mesh('Arm L • KayKit hand and continuous forearm'),
        mesh('Arm R • mirrored continuous forearm')]
sleeves = [mesh('Sleeve -1'), mesh('Sleeve 1')]
cuffs = [mesh('Folded cuff -1'), mesh('Folded cuff 1')]

# A compact smoothstep prevents visible kinks at the borders of a correction.
def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)

# 1 — Keep the KayKit cheek/jaw/nose topology. Edit ONLY the two isolated ears.
# Both ears are separate connected components of the source face mesh; selecting
# connected components avoids accidentally deforming the skull or the nose.
bm = bmesh.new()
bm.from_mesh(face.data)
seen = set()
ears = []
for start in bm.verts:
    if start in seen:
        continue
    component = []
    stack = [start]
    seen.add(start)
    while stack:
        vertex = stack.pop()
        component.append(vertex)
        for edge in vertex.link_edges:
            other = edge.other_vert(vertex)
            if other not in seen:
                seen.add(other)
                stack.append(other)
    cx = sum(v.co.x for v in component) / len(component)
    cz = sum(v.co.z for v in component) / len(component)
    if 18 <= len(component) <= 90 and abs(cx) > .34 and 1.38 < cz < 1.70:
        ears.append((component, cx, cz))
if len(ears) != 2 or ears[0][1] * ears[1][1] >= 0:
    bm.free()
    raise RuntimeError('V0.41 : impossible de distinguer les deux oreilles KayKit')
for component, cx, cz in ears:
    side = 1 if cx > 0 else -1
    for v in component:
        v.co.x = side * (abs(cx) - .038) + (v.co.x - cx) * .77
        v.co.z = cz + (v.co.z - cz) * .77 + .009
        v.co.y = -.011 + (v.co.y + .011) * .83 + .012
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(face.data)
bm.free()
face.data.update()

# 2 — Rebuild the missing *back* hair length by morphing the existing scalp cap.
# Front fringe and sides above the ears are untouched. The tapered nape reaches
# down close to the skull bottom rather than ending at the ear line.
for v in hair.data.vertices:
    x, y, z = v.co
    rear = smoothstep(.025, .23, y)
    low = 1.0 - smoothstep(1.55, 1.83, z)
    center = 1.0 - .25 * smoothstep(.22, .43, abs(x))
    if rear > 0 and low > 0:
        v.co.z -= .185 * rear * low * center
        v.co.y += .016 * rear * low
hair.data.update()

# 3 — One coherent arm silhouette: slim the continuous forearms and shirt
# sleeves using the same centerline. Move the INNER sleeve section under the
# torso (a genuine overlap), rather than adding disconnected shoulder balls.
# No new mesh object or floating elbow piece is introduced.
def arm_axis_x(z):
    return .432 + .114 * (1.0 - smoothstep(.57, 1.06, z))

def slim_arm_vertex(v, garment):
    x, y, z = v.co
    side = -1 if x < 0 else 1
    ax = arm_axis_x(z)
    # Narrow cross-section and tuck the entire arm closer to the torso.
    inner_tuck = .026 * smoothstep(.97, 1.13, z) if garment else .0
    new_x = (ax - .026) * .94 + (abs(x) - ax) * (.70 if garment else .78) - inner_tuck
    v.co.x = side * new_x
    v.co.y = -.020 + (y + .020) * (.81 if garment else .85)
    if garment:
        # The shoulder cap slopes into the torso and covers the inner seam.
        v.co.z = 1.00 + (z - 1.00) * .91 - .012 * smoothstep(.97, 1.13, z)
    else:
        # Keep palms at their original height; only bury the forearm top inside the sleeve.
        v.co.z += .012 * smoothstep(.83, 1.00, z)

for obj in arms:
    for v in obj.data.vertices:
        slim_arm_vertex(v, garment=False)
    obj.data.update()
for obj in sleeves + cuffs:
    for v in obj.data.vertices:
        slim_arm_vertex(v, garment=True)
    obj.data.update()

# Slim the cloth torso close to the shoulder junction so the original rounded
# shirt surface and now-inset sleeve don't create a broad, squared-off shoulder.
for v in shirt.data.vertices:
    x, y, z = v.co
    upper = smoothstep(.94, 1.10, z) * (1.0 - smoothstep(1.11, 1.19, z))
    side = smoothstep(.20, .32, abs(x))
    v.co.x *= (1.0 - .060 * upper * side)
shirt.data.update()

# 4 — Smaller hip silhouette. Preserve the trousers' continuous crotch/leg
# topology and the KayKit ankle/boot fit by tapering progressively with height.
for v in pants.data.vertices:
    x, y, z = v.co
    hip = smoothstep(.38, .71, z)
    v.co.x = x * (1.0 - .025 - .090 * hip)
    v.co.y = .015 + (y - .015) * (1.0 - .050 - .035 * hip)
pants.data.update()

root['version'] = '0.41'
root['notes'] = ('Smaller inset ears; full back nape; connected-looking inset shoulders; '
                 'slimmer continuous arms, cuffs and hip silhouette')

# Export ONLY the refined character, not the studio/camera or KayKit source.
bpy.ops.object.select_all(action='DESELECT')
for obj in model.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = root
bpy.ops.export_scene.gltf(
    filepath=str(OUT_GLB), export_format='GLB', use_selection=True,
    export_animations=False, export_cameras=False, export_lights=False,
    export_extras=True,
)
if OUT_GLB.stat().st_size < 30000:
    raise RuntimeError('V0.41 : export GLB anormalement petit')

# Four consistent orthographic-ish studio views, using the source studio.
scene = bpy.context.scene
camera = bpy.data.objects.get('Review camera')
if camera is None:
    raise RuntimeError('V0.41 : caméra de revue absente')
scene.camera = camera
scene.render.image_settings.file_format = 'PNG'
scene.render.resolution_x = 760
scene.render.resolution_y = 850
scene.render.resolution_percentage = 100
if scene.render.engine == 'CYCLES':
    scene.cycles.samples = 18
    scene.cycles.use_denoising = True
views = {
    'front': (0,-7,1.5),
    'three-quarter': (3.4,-6,2.8),
    'side': (7,0,1.5),
    'back': (0,7,1.7),
}
target = Vector((0,0,1.16))
camera.location = views['three-quarter']
camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND), compress=True)
for view, location in views.items():
    camera.location = location
    camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath = str(REVIEW / (view+'.png'))
    bpy.ops.render.render(write_still=True)
camera.location = views['three-quarter']
camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath = ''
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND), compress=True)
report = {
    'version': '0.41', 'base': 'gardener-v040.blend',
    'ear_islands': 2, 'animations': 0, 'glb_bytes': OUT_GLB.stat().st_size,
    'views': list(views), 'model_objects': len(list(model.objects)),
}
(REVIEW/'asset-report.json').write_text(json.dumps(report, indent=2)+'\n')
print('KOMOREBI_V041_OK', json.dumps(report))
