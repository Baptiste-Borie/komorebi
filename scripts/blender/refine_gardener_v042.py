"""Komorebi V0.42 — targeted garment fit on the V0.41 editable Blender character.

Run: blender -b --threads 6 --python-exit-code 1 --python scripts/blender/refine_gardener_v042.py
The original KayKit-derived body, face and proportions remain unchanged.
"""
import bpy
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/characters/gardener-v041.blend'
BLEND = ROOT / 'assets/characters/gardener-v042.blend'
GLB = ROOT / 'public/assets/gardener-v042.glb'
REVIEW = ROOT / 'reviews/character-lab/v042'
REVIEW.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = 0
model = bpy.data.collections.get('GARDENER • editable surfaces')
root = bpy.data.objects.get('Gardener_STATIC')
if model is None or root is None:
    raise RuntimeError('V0.42: V0.41 collection/root missing')

def required(name):
    obj = bpy.data.objects.get(name)
    if obj is None or obj.type != 'MESH' or name not in model.objects:
        raise RuntimeError('V0.42: expected mesh not found: '+name)
    return obj

shirt = required('Shirt • shaped shoulder and torso mesh')
pants = required('Overalls • continuous waist seat crotch and legs')
hair = required('Hair • short tapered tousled cap')
for name in ('Sleeve 1','Sleeve -1','Folded cuff 1','Folded cuff -1'):
    required(name)

def smoothstep(a,b,x):
    t=max(0.,min(1.,(x-a)/(b-a)))
    return t*t*(3.-2.*t)

# V0.41 narrowed the trousers without tucking the original shirt inside them.
# This made the shirt poke through the side of the trousers as ragged white shards.
# Keep the upper shirt/shoulders unchanged and re-fit the lower cloth gradually.
changed=0
for vert in shirt.data.vertices:
    p=vert.co
    inset=1.0-smoothstep(.72,.89,p.z)
    if inset <= 0:
        continue
    # The surface below the trousers' waistband is now well inside the denim.
    p.x *= (1.0-.205*inset)
    p.y = .015+(p.y-.015)*(1.0-.190*inset)
    changed += 1
shirt.data.update()
if changed < 25:
    raise RuntimeError('V0.42: shirt geometry/scale unexpected; refusing to export')

# Soften the sharp flat-bottom silhouette at the back of the hair with a
# barely asymmetric central nape, leaving fringe and ear clearance intact.
hair_adjusted=0
for vert in hair.data.vertices:
    p=vert.co
    rear=smoothstep(.16,.29,p.y)
    lower=1.0-smoothstep(1.56,1.77,p.z)
    central=1.0-smoothstep(.16,.41,abs(p.x))
    strength=rear*lower*central
    if strength <= 0:
        continue
    p.z -= .040*strength
    p.y += .005*strength
    hair_adjusted += 1
hair.data.update()

# The working outfit still has a flat line where the trouser waist intersects
# the shirt. Do not introduce fake fabric details to hide this geometry issue.
root['version']='0.42'
root['notes']='V0.41 fit correction: tucked shirt hem + gently shaped short nape'

bpy.ops.object.select_all(action='DESELECT')
for obj in model.objects: obj.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(GLB),export_format='GLB',use_selection=True,
                          export_animations=False,export_cameras=False,
                          export_lights=False,export_extras=True)
if GLB.stat().st_size < 30000:
    raise RuntimeError('V0.42: exported GLB is suspiciously small')

scene=bpy.context.scene
camera=bpy.data.objects.get('Review camera')
if camera is None:
    raise RuntimeError('V0.42: studio camera missing')
scene.camera=camera
scene.render.image_settings.file_format='PNG'
scene.render.resolution_x=760
scene.render.resolution_y=850
scene.render.resolution_percentage=100
if scene.render.engine=='CYCLES':
    scene.cycles.samples=18
    scene.cycles.use_denoising=True
views={'front':(0,-7,1.5),'three-quarter':(3.4,-6,2.8),
       'side':(7,0,1.5),'back':(0,7,1.7)}
target=Vector((0,0,1.16))
for key,loc in views.items():
    camera.location=loc
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(REVIEW/(key+'.png'))
    bpy.ops.render.render(write_still=True)
camera.location=views['three-quarter']
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=''
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND),compress=True)
report={'version':'0.42','base':'gardener-v041.blend','shirt_vertices_tucked':changed,
        'hair_vertices_refined':hair_adjusted,'glb_bytes':GLB.stat().st_size,
        'animations':0,'views':list(views)}
(REVIEW/'asset-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('KOMOREBI_V042_OK',json.dumps(report))
