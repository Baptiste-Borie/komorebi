"""Komorebi V0.43 — subtle, reversible geometry polish from V0.42.
Only the static character is exported. Blender studio does not enter the GLB.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'assets/characters/gardener-v042.blend'
OUT_BLEND = ROOT / 'assets/characters/gardener-v043.blend'
OUT_GLB = ROOT / 'public/assets/gardener-v043.glb'
REVIEW = ROOT / 'reviews/character-lab/v043'
if not BASE.exists():
    raise RuntimeError('V0.43: missing source v042 .blend: ' + str(BASE))
for directory in (OUT_BLEND.parent, OUT_GLB.parent, REVIEW):
    directory.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE))
bpy.context.preferences.filepaths.save_version = 0
model = bpy.data.collections.get('GARDENER • editable surfaces')
root = bpy.data.objects.get('Gardener_STATIC')
if model is None or root is None:
    raise RuntimeError('V0.43: source V0.42 is missing its character collection')

def required(name):
    obj = bpy.data.objects.get(name)
    if obj is None or obj.type != 'MESH' or name not in model.objects:
        raise RuntimeError('V0.43: expected character mesh missing: ' + name)
    return obj

shirt = required('Shirt • shaped shoulder and torso mesh')
sleeves = [required('Sleeve -1'), required('Sleeve 1')]
cuffs = [required('Folded cuff -1'), required('Folded cuff 1')]
arms = [required('Arm L • KayKit hand and continuous forearm'),
        required('Arm R • mirrored continuous forearm')]
hair = required('Hair • short tapered tousled cap')
straps = [required('Shoulder strap -1'), required('Shoulder strap 1')]

def smooth(a, b, x):
    t = max(0.0, min(1.0, (x-a)/(b-a)))
    return t*t*(3.0-2.0*t)

stats = {}

# 1 — Shoulder: the sleeve's inner/open upper rings must overlap the shirt,
# not terminate beside it. Tuck the shoulder portion under the torso and
# taper continuously towards the unchanged cuff. No new shoulder balls.
# Sleeve root typically spans z=1.02..1.13; elbow ends near z=.90.
modified = 0
for obj in sleeves:
    for vert in obj.data.vertices:
        p = vert.co
        at_shoulder = smooth(.965, 1.105, p.z)
        if at_shoulder > 0.0:
            direction = 1.0 if p.x >= 0.0 else -1.0
            p.x -= direction * (.025 * at_shoulder)
            p.y = -.020 + (p.y + .020) * (1.0 - .045 * at_shoulder)
            p.z -= .004 * at_shoulder
            modified += 1
    obj.data.update()
stats['sleeve_shoulder_vertices'] = modified
if modified < 30:
    raise RuntimeError('V0.43: sleeve geometry is unexpected; refusing to export')

# 2 — At the rolled hem the skin peeks out as an irregular salmon/white strip.
# Fit cuff around the original sleeve end without scaling the arm or changing
# the pose. The cuff remains a separate editable garment component.
modified = 0
for obj in cuffs:
    verts = obj.data.vertices
    cx = sum(v.co.x for v in verts) / len(verts)
    cy = sum(v.co.y for v in verts) / len(verts)
    for vert in verts:
        p = vert.co
        p.x = cx + (p.x - cx) * 1.044
        p.y = cy + (p.y - cy) * 1.053
        p.z -= .006
        modified += 1
    obj.data.update()
stats['cuff_vertices'] = modified

# Slightly bury just the hidden top of the forearms beneath the sleeve.
# The hands and visible portions are not reshaped.
modified = 0
for obj in arms:
    for vert in obj.data.vertices:
        p = vert.co
        hidden = smooth(.885, 1.045, p.z)
        if hidden > 0:
            p.y = -.020 + (p.y + .020) * (1.0 - .055 * hidden)
            modified += 1
    obj.data.update()
stats['arm_upper_vertices'] = modified

# 3 — Make the cap edge curve smoothly over the ear on the profile view.
# Existing length of rear nape, forehead shape, ears and hat stay unchanged.
modified = 0
for vert in hair.data.vertices:
    p = vert.co
    side = smooth(.225, .34, abs(p.x))
    near_ear = math.exp(-((p.y - .014) / .165) ** 2)
    bottom = 1.0 - smooth(1.65, 1.87, p.z)
    amount = side * near_ear * bottom
    if amount > .01:
        p.z -= .034 * amount
        p.y += .004 * amount
        modified += 1
hair.data.update()
stats['side_hair_vertices'] = modified

# 4 — The back straps should follow the shirt's back curvature instead of
# looking like two perfectly flat hanging ribbons. Reference the *actual*
# shirt mesh rather than guessing where the back surface is.
polygons = [tuple(p.vertices) for p in shirt.data.polygons]
shirt_bvh = BVHTree.FromPolygons([v.co.copy() for v in shirt.data.vertices], polygons)
modified = 0
for obj in straps:
    for vert in obj.data.vertices:
        p = vert.co
        back = smooth(.055, .18, p.y)
        if back <= 0.0:
            continue
        bottom = 1.0 - smooth(.82, 1.10, p.z)
        sign = 1.0 if p.x >= 0.0 else -1.0
        p.x -= sign * (.009 * bottom * back)
        hit, _, _, _ = shirt_bvh.ray_cast(Vector((p.x, 2.0, p.z)), Vector((0, -1, 0)))
        if hit is not None:
            desired = hit.y + .014
            # Small, clamped move: preserve garment thickness and avoid
            # moving the entire strap through the chest/shirt.
            delta = max(-.014, min(.014, desired-p.y))
            p.y += delta * .42 * back
        modified += 1
    obj.data.update()
stats['back_strap_vertices'] = modified
if modified < 10:
    raise RuntimeError('V0.43: back strap geometry is unexpected')

root['version'] = '0.43'
root['notes'] = 'Shoulder sleeve seating, folded cuff fit, softened temple/nape transition and back strap drape'

# Guard against errors before exporting any asset.
for obj in (shirt, *sleeves, *cuffs, *arms, hair, *straps):
    for v in obj.data.vertices:
        if not all(math.isfinite(value) for value in v.co):
            raise RuntimeError('V0.43: non-finite vertex in ' + obj.name)

bpy.ops.object.select_all(action='DESELECT')
for obj in model.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = root
bpy.ops.export_scene.gltf(filepath=str(OUT_GLB), export_format='GLB', use_selection=True,
                          export_animations=False, export_cameras=False,
                          export_lights=False, export_extras=True)
if not OUT_GLB.exists() or OUT_GLB.stat().st_size < 30000:
    raise RuntimeError('V0.43: GLB export too small or missing')

scene = bpy.context.scene
camera = bpy.data.objects.get('Review camera')
if camera is None:
    raise RuntimeError('V0.43: source studio camera not found')
scene.camera = camera
scene.render.image_settings.file_format = 'PNG'
scene.render.resolution_x = 760
scene.render.resolution_y = 850
scene.render.resolution_percentage = 100
if scene.render.engine == 'CYCLES':
    scene.cycles.samples = 18
    scene.cycles.use_denoising = True
views = {
    'front': (0, -7, 1.5), 'three-quarter': (3.4, -6, 2.8),
    'side': (7, 0, 1.5), 'back': (0, 7, 1.7),
}
target = Vector((0, 0, 1.16))
# Preserve editable source before slow renders; do not save the source over.
camera.location = views['three-quarter']
camera.rotation_euler = (target - camera.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND), compress=True)
for label, position in views.items():
    camera.location = position
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath = str(REVIEW / (label + '.png'))
    bpy.ops.render.render(write_still=True)
camera.location = views['three-quarter']
camera.rotation_euler = (target - camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath = ''
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND), compress=True)
report = {
    'version': '0.43', 'base': 'gardener-v042.blend',
    'glb_bytes': OUT_GLB.stat().st_size, 'animations': 0,
    'changed_vertices': stats, 'views': list(views),
}
(REVIEW / 'asset-report.json').write_text(json.dumps(report, indent=2) + '\n')
print('KOMOREBI_V043_OK', json.dumps(report))
