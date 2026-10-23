"""Komorebi Character Lab v0.36: editable original Blender gardener.

Usage from repository root:
  blender --background --python scripts/blender/build_gardener.py
Outputs a .blend, game-ready .glb and three review PNGs.
All geometry is generated locally; no copyrighted characters or downloads.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
BLEND = ROOT / 'assets/characters/gardener-v036.blend'
GLB = ROOT / 'public/assets/gardener-v036.glb'
REVIEW = ROOT / 'reviews/character-lab'
for p in (BLEND, GLB):
    p.parent.mkdir(parents=True, exist_ok=True)
REVIEW.mkdir(parents=True, exist_ok=True)

# Studio parameters: edit these between iterations, or change named objects in Blender.
HEAD_WIDTH = 0.58
HEAD_HEIGHT = 0.52
BODY_WIDTH = 0.79
BEVEL_SEGMENTS = 3

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for material in list(bpy.data.materials):
    bpy.data.materials.remove(material)


def rgba(rgb):
    # Hex pigment interpreted in the same sRGB palette as Komorebi.
    return tuple(((rgb >> shift) & 255) / 255 for shift in (16, 8, 0)) + (1.0,)


def material(name, color, roughness=0.91):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = rgba(color)
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get('Principled BSDF')
    principled.inputs['Base Color'].default_value = mat.diffuse_color
    principled.inputs['Roughness'].default_value = roughness
    return mat

skin = material('01 - Peau chaude', 0xDEAF8D)
skin_shade = material('02 - Joues', 0xD99A79)
hair = material('03 - Cheveux brun noisette', 0x593E30)
hair_light = material('04 - Frange', 0x694736)
eye_white = material('05 - Blanc des yeux', 0xFFF6E8)
iris = material('06 - Iris noisette', 0x6B5340)
pupil = material('07 - Pupilles', 0x262723)
glint = material('08 - Reflets', 0xFFFFFF)
shirt = material('09 - Chemise sauge', 0x8EAD73)
overall = material('10 - Salopette bleu-vert', 0x406F6A)
overall_dark = material('11 - Bas salopette', 0x345B57)
boot = material('12 - Bottes brun fonce', 0x5B4B3D)
sole = material('13 - Semelles', 0x433D35)
hat = material('14 - Chapeau paille', 0xCBA66A)
hat_band = material('15 - Bande chapeau', 0x71805A)
button = material('16 - Boutons', 0xD7C59C)
mouth_mat = material('17 - Sourire', 0x6A4C3A)

collection = bpy.data.collections.new('KOMOREBI - Jardinier (edit me)')
bpy.context.scene.collection.children.link(collection)
root = bpy.data.objects.new('Character_ROOT', None)
collection.objects.link(root)


def link_obj(obj, mat):
    if mat is not None:
        obj.data.materials.append(mat)
    for col in list(obj.users_collection):
        col.objects.unlink(obj)
    collection.objects.link(obj)
    obj.parent = root
    return obj


def round_box(name, pos, dims, mat, bevel=.10, segments=BEVEL_SEGMENTS):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = obj.modifiers.new('Soft low-poly corners', 'BEVEL')
    mod.width = min(bevel, min(dims) * .33)
    mod.segments = segments
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    normal = obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    bpy.ops.object.modifier_apply(modifier=normal.name)
    return link_obj(obj, mat)


def ball(name, pos, radius, mat, segments=24, rings=14, smooth=True):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=pos)
    obj = bpy.context.object
    obj.name = name
    obj.scale = radius
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for face in obj.data.polygons:
        face.use_smooth = smooth
    return link_obj(obj, mat)


def rod(name, start, end, radius, mat, segments=10):
    start, end = Vector(start), Vector(end)
    delta = end - start
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=radius, depth=delta.length, location=(start+end)*.5)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = delta.to_track_quat('Z','Y').to_euler()
    return link_obj(obj, mat)

# A compact, soft toy silhouette; forward is -Y in Blender / +Z in glTF.
for side, name in [(-1,'Gauche'),(1,'Droite')]:
    x = side * .215
    # Stubby legs end inside the dungarees; no detached joints.
    ball('Jambe '+name, (x,.012,.40), (.19,.19,.28), overall_dark, 16, 10)
    round_box('Botte '+name, (x,-.075,.19), (.34,.42,.30), boot, .12)
    round_box('Semelle '+name, (x,-.11,.075), (.36,.46,.075), sole, .032)

ball('Corps chemise', (0,0,.95), (BODY_WIDTH*.57,.35,.49), shirt, 24, 14)
round_box('Salopette bassin', (0,-.042,.68), (.77,.61,.36), overall, .17)
round_box('Bavette salopette', (0,-.313,.94), (.53,.13,.37), overall, .12)
for side, name in [(-1,'Gauche'),(1,'Droite')]:
    x = side*.225
    rod('Bretelle '+name, (x,-.35,1.10),(x*.93,-.36,.87),.055,overall,10)
    ball('Bouton '+name,(x,-.428,.91),(.045,.018,.045),button,12,8)
    # Slightly tapered soft sleeves and forearms, connected to the torso.
    ball('Manche '+name,(side*.432,-.005,1.05),(.215,.255,.25),shirt,18,11)
    ball('Bras '+name,(side*.535,-.045,.775),(.155,.18,.23),skin,18,10)
    ball('Main '+name,(side*.56,-.107,.585),(.135,.17,.14),skin,16,10)

ball('Cou', (0,-.012,1.275),(.175,.17,.18),skin,16,10)
ball('Visage arrondi', (0,-.035,1.58),(HEAD_WIDTH,.49,HEAD_HEIGHT),skin,32,18)
# Hair sits on the skull with an asymmetrical sweep, not a helmet of cubes.
ball('Calotte cheveux', (0,.005,1.93),(.585,.495,.235),hair,24,14)
ball('Frange gauche',(-.245,-.300,1.815),(.22,.195,.14),hair_light,18,10)
ball('Frange droite',(.12,-.366,1.825),(.25,.150,.12),hair,20,10)
# Eye whites / iris / pupil form an expressive, readable cartoon face.
for side,name in [(-1,'Gauche'),(1,'Droite')]:
    x = side*.225
    ball('Oeil blanc '+name,(x,-.497,1.615),(.122,.045,.147),eye_white,18,12)
    ball('Iris '+name,(x+.018,-.540,1.600),(.081,.027,.105),iris,18,12)
    ball('Pupille '+name,(x+.017,-.566,1.598),(.052,.018,.078),pupil,18,12)
    ball('Brillance '+name,(x-.013,-.584,1.645),(.024,.012,.030),glint,12,8)
    ball('Joue '+name,(side*.39,-.392,1.402),(.102,.025,.060),skin_shade,14,8)
ball('Petit nez brun', (0,-.536,1.435),(.076,.055,.065),hair_light,16,10)
# Low-poly smile as a fine, editable curve following the head.
curve=bpy.data.curves.new('Sourire curve','CURVE');curve.dimensions='3D';curve.bevel_depth=.014;curve.bevel_resolution=2
spline=curve.splines.new('POLY');spline.points.add(10)
for idx in range(11):
    u=idx/10; x=-.145+.29*u
    z=1.352-.047*math.sin(math.pi*u)
    spline.points[idx].co=(x,-.493+.023*abs(x)/.145,z,1)
smile=bpy.data.objects.new('Sourire',curve);collection.objects.link(smile);smile.parent=root;curve.materials.append(mouth_mat)
# glTF does not reliably export Blender curves; convert the smile to a mesh.
bpy.ops.object.select_all(action='DESELECT')
smile.select_set(True);bpy.context.view_layer.objects.active=smile
bpy.ops.object.convert(target='MESH')

# Simple bucket / straw hat, soft facets and a restrained silhouette.
bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.68,depth=.062,location=(0,.012,2.09))
link_obj(bpy.context.object,hat).name='Bord du chapeau'
bpy.ops.mesh.primitive_cone_add(vertices=20,radius1=.465,radius2=.405,depth=.305,location=(0,.012,2.245))
link_obj(bpy.context.object,hat).name='Couronne du chapeau'
bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=.464,depth=.046,location=(0,.012,2.132))
link_obj(bpy.context.object,hat_band).name='Ruban vert'

# Source file is editable in Blender. Export selected character geometry only.
bpy.ops.object.select_all(action='DESELECT')
for o in collection.objects:
    o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(GLB),export_format='GLB',use_selection=True,
                          export_cameras=False,export_lights=False)
print('Export GLB:',GLB)

# Review plinth and studio camera belong to the .blend but NOT the GLB.
scene=bpy.context.scene
floor_mat=material('STUDIO - Terres',0x897154)
ground_mat=material('STUDIO - Herbe',0x94B464)
bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=1.35,depth=.16,location=(0,0,-.11))
platform=bpy.context.object;platform.name='STUDIO - Plateau';platform.data.materials.append(floor_mat)
bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=1.32,depth=.013,location=(0,0,-.022))
platform_top=bpy.context.object;platform_top.name='STUDIO - Herbe';platform_top.data.materials.append(ground_mat)

bpy.ops.object.camera_add()
camera=bpy.context.object;camera.name='STUDIO - Camera';scene.camera=camera
camera.data.type='ORTHO';camera.data.ortho_scale=3.75
scene.render.resolution_x=800;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.render.engine='BLENDER_WORKBENCH'
scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL'
scene.display.shading.show_shadows=True
scene.display.shading.show_cavity=True
scene.display.shading.cavity_type='BOTH'
scene.render.image_settings.color_mode='RGBA'
scene.world.color=(.83,.83,.81)
views={'front':(0,-5.7,2.65),'three-quarter':(4.0,-4.5,2.7),'side':(5.8,0.15,2.55)}
for label,loc in views.items():
    camera.location=loc
    target=Vector((0,0,1.17))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(REVIEW/f'v036-{label}.png')
    bpy.ops.render.render(write_still=True)
    print('Review PNG:',scene.render.filepath)

scene.render.filepath=''
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND),compress=True)
print('Editable BLEND:',BLEND)
