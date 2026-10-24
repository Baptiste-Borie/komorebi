"""Komorebi V0.40 — polish existing V0.39 Blender model without rebuilding its geometry.

Run from repository root using Blender:
  blender -b --threads 6 --python-exit-code 1 --python scripts/blender/polish_gardener_v040.py
"""
import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'assets/characters/gardener-v039.blend'
OUT_BLEND = ROOT / 'assets/characters/gardener-v040.blend'
OUT_GLB = ROOT / 'public/assets/gardener-v040.glb'
REVIEW = ROOT / 'reviews/character-lab/v040'
REVIEW.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(BASE))
bpy.context.preferences.filepaths.save_version = 0
model = bpy.data.collections.get('GARDENER • editable surfaces')
root = bpy.data.objects.get('Gardener_STATIC')
assert model is not None and root is not None, 'V0.39: collection ou racine introuvable'

def required(name):
    obj = bpy.data.objects.get(name)
    if obj is None or obj.type != 'MESH':
        raise RuntimeError('V0.39: maillage manquant: ' + name)
    return obj

# Assert all anchors before changing anything.
anchors = [
    'Hair • short tapered tousled cap', 'Brows • relaxed KayKit islands',
    'Hat ribbon • fitted olive band', 'Bib • fitted curved denim',
    'Pocket • fitted five-sided patch', 'Pocket top rolled edge',
    'Bib side seam -1', 'Bib side seam 1',
    'Shoulder strap -1', 'Shoulder strap 1',
    'Sleeve -1', 'Sleeve 1', 'Folded cuff -1', 'Folded cuff 1',
]
objects = {name: required(name) for name in anchors}

# 1. The hat's ribbon previously grazed the crown surface. Move it out
# by ~1 cm (in garden model units), maintaining the actual elliptical profile.
ribbon = objects['Hat ribbon • fitted olive band']
for vert in ribbon.data.vertices:
    x, y, z = vert.co
    vert.co.x = x * 1.032
    vert.co.y = .015 + (y - .015) * 1.032
ribbon.data.update()

# 2. Hair should end as a subtle nape, not an abrupt faceted curtain.
# Only refine the lower vertices behind the ears, preserving the front hairline.
hair = objects['Hair • short tapered tousled cap']
for vert in hair.data.vertices:
    x, y, z = vert.co
    rear = max(0.0, (y - .065) / .40)
    side = min(1.0, abs(x) / .45)
    lower = max(0.0, min(1.0, (1.79 - z) / .18))
    if rear and lower:
        vert.co.z += .028 * rear * lower * (1 - .30 * side)
        vert.co.y -= .008 * rear * lower
hair.data.update()

# 3. Relax the stern, V-shaped eyebrows; keep the KayKit black eyes unchanged.
brows = objects['Brows • relaxed KayKit islands']
for vert in brows.data.vertices:
    x, y, z = vert.co
    # Preserve each brow's volume while reducing the downward slant.
    dx = abs(x) - .218
    vert.co.z = 1.745 + (z - 1.745) * .76 + .017 + .030 * dx
brows.data.update()

# 4. Push stitched surfaces fractionally away from the underlying shirt/denim.
# Removes coplanar dark flickering without thickening the whole outfit.
for name, depth in [
    ('Bib • fitted curved denim', -.006),
    ('Pocket • fitted five-sided patch', -.012),
    ('Pocket top rolled edge', -.021),
    ('Bib side seam -1', -.022),
    ('Bib side seam 1', -.022),
]:
    obj = objects[name]
    for v in obj.data.vertices:
        v.co.y += depth
    obj.data.update()

# Shoulder straps cross the shoulders from front (-Y) to back (+Y), so move
# only the exposed ends, leaving the high shoulder transition in place.
for name in ('Shoulder strap -1', 'Shoulder strap 1'):
    obj = objects[name]
    for v in obj.data.vertices:
        front = min(1.0, max(0.0, (-v.co.y - .055) / .17))
        back = min(1.0, max(0.0, (v.co.y - .06) / .18))
        v.co.y += -.012 * front + .010 * back
    obj.data.update()

# 5. Sleeves/rolled cuffs: soften their mechanical cylinders at the outer end
# rather than creating an extra disconnected elbow piece.
for name in ('Folded cuff -1', 'Folded cuff 1'):
    obj = objects[name]
    xvalues = [abs(v.co.x) for v in obj.data.vertices]
    lo, hi = min(xvalues), max(xvalues)
    for v in obj.data.vertices:
        t = (abs(v.co.x) - lo) / max(1e-5, hi - lo)
        v.co.z += .006 * (1 - t)
    obj.data.update()

# 6. A restrained, original leaf embroidery on the existing front pocket.
# Project each new point onto the actual pocket geometry rather than placing
# a flat floating symbol over the shirt.
pocket = objects['Pocket • fitted five-sided patch']
faces = [tuple(p.vertices) for p in pocket.data.polygons]
bvh = BVHTree.FromPolygons([v.co.copy() for v in pocket.data.vertices], faces)
leaf_mat = bpy.data.materials.get('Embroidery • muted sage')
if leaf_mat is None:
    leaf_mat = bpy.data.materials.new('Embroidery • muted sage')
    leaf_mat.use_nodes = True
    leaf_mat.diffuse_color = (.27, .40, .30, 1)
    bsdf = leaf_mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = leaf_mat.diffuse_color
    bsdf.inputs['Roughness'].default_value = .92

def project(x,z):
    hit, _, _, _ = bvh.ray_cast(Vector((x, -.7, z)), Vector((0, 1, 0)))
    if hit is None:
        raise RuntimeError('Projection broderie hors poche : ' + str((x,z)))
    return (x, hit.y - .014, z)

# Two asymmetric tapered leaves, not a thick emblem or high-contrast badge.
leaf_vertices = [
    project(-.019,.859), project(-.053,.873), project(-.057,.904),
    project(-.031,.895), project(-.007,.870),
    project(.008,.862), project(.036,.882), project(.052,.900),
    project(.046,.867), project(.023,.854),
]
leaf_faces = [(0,1,2,3,4), (5,6,7,8,9)]
mesh = bpy.data.meshes.new('Small botanical stitched motif')
mesh.from_pydata(leaf_vertices, [], leaf_faces)
mesh.update()
mesh.materials.append(leaf_mat)
leaves = bpy.data.objects.new('Pocket • tiny leaf embroidery', mesh)
model.objects.link(leaves)
leaves.parent = root
for polygon in mesh.polygons:
    polygon.use_smooth = False

# Minimal stem: the point array follows the pocket surface.
stempts = [project(x,z) for x,z in [(-.027,.862),(-.012,.850),(.008,.845),(.028,.847)]]
curve = bpy.data.curves.new('Embroidery • leaf stem', 'CURVE')
curve.dimensions = '3D'; curve.bevel_depth = .0025; curve.bevel_resolution = 2
spline = curve.splines.new('POLY'); spline.points.add(len(stempts)-1)
for pt, xyz in zip(spline.points, stempts): pt.co = (*xyz, 1)
curve.materials.append(leaf_mat)
stem_obj = bpy.data.objects.new('Pocket • embroidery stem', curve)
model.objects.link(stem_obj); stem_obj.parent = root
bpy.ops.object.select_all(action='DESELECT')
stem_obj.select_set(True); bpy.context.view_layer.objects.active = stem_obj
bpy.ops.object.convert(target='MESH')

root['version'] = '0.40'
root['notes'] = 'V0.39 polish: hat band, hair nape, eyebrows, clothing overlaps, tiny pocket motif'

# Export character ONLY. The .blend retains the studio, and original V0.39
# files are left untouched for side-by-side comparisons.
bpy.ops.object.select_all(action='DESELECT')
for obj in model.objects: obj.select_set(True)
bpy.context.view_layer.objects.active = root
bpy.ops.export_scene.gltf(
    filepath=str(OUT_GLB), export_format='GLB', use_selection=True,
    export_animations=False, export_cameras=False, export_lights=False,
    export_extras=True,
)

scene = bpy.context.scene
camera = bpy.data.objects.get('Review camera')
assert camera is not None, 'V0.39: caméra de revue absente'
scene.camera = camera
scene.render.image_settings.file_format = 'PNG'
scene.render.resolution_x = 800
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.cycles.samples = 24
scene.cycles.use_denoising = True
views = {
    'front': (0,-7,1.5),
    'three-quarter': (3.4,-6,2.8),
    'side': (7,0,1.5),
    'back': (0,7,1.7),
}
# An isolated studio .blend is saved before rendering, so the artist's source
# persists even if a slow render is interrupted.
camera.location = views['three-quarter']
camera.rotation_euler = (Vector((0,0,1.16))-camera.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND), compress=True)
for name, loc in views.items():
    camera.location = loc
    camera.rotation_euler = (Vector((0,0,1.16))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath = str(REVIEW / (name + '.png'))
    bpy.ops.render.render(write_still=True)
camera.location = views['three-quarter']
camera.rotation_euler = (Vector((0,0,1.16))-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath = ''
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND), compress=True)

report = {
    'version':'0.40', 'base':'gardener-v039.blend',
    'mesh_objects':len([o for o in model.objects if o.type=='MESH']),
    'glb_bytes':OUT_GLB.stat().st_size,
    'reviews':list(views), 'animations':0,
}
(REVIEW / 'asset-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('KOMOREBI_V040_OK', json.dumps(report))
