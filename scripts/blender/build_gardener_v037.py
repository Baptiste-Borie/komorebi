"""Komorebi v0.37: original polished, soft low-poly gardener, static study.
Blender >= 4.3. No external assets. Model + 3 fixed studio views.
Focus on silhouette and face only; no rigging, no animations, no game logic.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
BLEND = ROOT / 'assets/characters/gardener-v037.blend'
GLB = ROOT / 'public/assets/gardener-v037.glb'
REVIEW = ROOT / 'reviews/character-lab/v037'
for path in (BLEND, GLB):
    path.parent.mkdir(parents=True, exist_ok=True)
REVIEW.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for mat in list(bpy.data.materials):
    bpy.data.materials.remove(mat)
bpy.context.preferences.filepaths.save_version = 0

def rgba(color):
    return (*(((color >> shift) & 255) / 255 for shift in (16, 8, 0)), 1.0)

def mat(name, color, roughness=0.92):
    m = bpy.data.materials.new(name)
    m.diffuse_color = rgba(color)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = m.diffuse_color
    p.inputs['Roughness'].default_value = roughness
    return m

SKIN = mat('01 · peau pêche', 0xF0BC98)
CHEEK = mat('02 · blush discret', 0xEFA58E)
NOSE = mat('03 · nez terracotta', 0xBD8265)
HAIR = mat('04 · brun noisette', 0x624537)
EYE_OUT = mat('05 · contours des yeux doux', 0x564437)
EYE_WHITE = mat('06 · yeux ivoire', 0xFFFAEE)
IRIS = mat('07 · iris châtain', 0x675443)
PUPIL = mat('08 · pupilles', 0x292725)
GLINT = mat('09 · lumière des yeux', 0xFFFFFF)
MOUTH = mat('10 · sourire', 0x784E42)
SHIRT = mat('11 · coton écru', 0xF1E7C9)
OVERALL = mat('12 · salopette sauge', 0x63877B)
OVERALL_SHADE = mat('13 · salopette coutures', 0x51756C)
BUTTONS = mat('14 · boutons ocre clair', 0xDBC79C)
SHOES = mat('15 · bottines noisette', 0x74634E)
SOLE = mat('16 · semelles', 0x574B3D)
HAT = mat('17 · paille', 0xD4B57E)
HAT_BAND = mat('18 · ruban sauge', 0x7A8564)

collection = bpy.data.collections.new('KOMOREBI / Jardinier v037 · modele statique')
bpy.context.scene.collection.children.link(collection)
root = bpy.data.objects.new('Jardinier_ROOT', None)
collection.objects.link(root)

def attach(obj, material):
    obj.data.materials.append(material)
    for c in tuple(obj.users_collection):
        c.objects.unlink(obj)
    collection.objects.link(obj)
    obj.parent = root
    return obj

def egg(name, position, scale, material, segments=32, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=position)
    o=bpy.context.object
    o.name=name
    o.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for f in o.data.polygons:
        f.use_smooth = True
    return attach(o,material)

def rounded(name, position, dims, material, radius=.07):
    bpy.ops.mesh.primitive_cube_add(size=1,location=position)
    o=bpy.context.object;o.name=name;o.dimensions=dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod=o.modifiers.new('Contours adoucis','BEVEL')
    mod.width=min(radius,min(dims)*.42);mod.segments=4
    bpy.context.view_layer.objects.active=o
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for f in o.data.polygons:f.use_smooth=True
    return attach(o,material)

def cylinder(name, position, radius, depth, material, vertices=32, radius_top=None):
    if radius_top is not None:
        bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=radius_top, depth=depth, location=position)
    else:
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=position)
    return attach(bpy.context.object,material)

def rod(name, start, end, radius, material, verts=12):
    p,q=Vector(start),Vector(end);vec=q-p
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=vec.length,location=(p+q)*.5)
    o=bpy.context.object;o.rotation_euler=vec.to_track_quat('Z','Y').to_euler();o.name=name
    return attach(o,material)

# Original cartoon proportions: ~2.3 world units high, large soft head,
# integrated rounded torso, short legs and no articulated fingers.
for side, name in ((-1,'G'),(1,'D')):
    x=side*.182
    egg('Jambe · '+name,(x,.018,.39),(.175,.170,.24),OVERALL,24,16)
    rounded('Bottine · '+name,(x,-.092,.166),(.295,.405,.235),SHOES,.087)
    rounded('Semelle · '+name,(x,-.106,.062),(.302,.410,.064),SOLE,.024)

egg('Torse arrondi',(0,.028,.941),(.387,.287,.392),SHIRT,36,24)
egg('Salopette bassin',(0,-.026,.665),(.384,.297,.226),OVERALL,32,20)
# Bib follows torso, rather than a large rectangular slab floating on the chest.
rounded('Bavette',(0,-.284,.954),(.420,.080,.245),OVERALL,.057)
rounded('Poche petite',(0,-.330,.927),(.225,.021,.105),OVERALL_SHADE,.022)
for side,name in ((-1,'G'),(1,'D')):
    x=side*.207
    strap=rod('Bretelle · '+name,(x,-.260,1.130),(x*.96,-.324,1.004),.043,OVERALL,14)
    egg('Bouton · '+name,(x*.96,-.369,1.006),(.030,.014,.030),BUTTONS,14,10)
    egg('Manche · '+name,(side*.381,.005,1.084),(.173,.188,.186),SHIRT,24,16)
    # A single tapered arm volume hides intersections with the sleeve.
    fore=egg('Bras doux · '+name,(side*.483,-.020,.870),(.132,.149,.223),SKIN,24,16)
    fore.rotation_euler[1]=side*.18
    egg('Main moufle · '+name,(side*.522,-.065,.678),(.129,.142,.133),SKIN,24,16)

egg('Petit cou',(0,0,1.292),(.169,.155,.168),SKIN,24,16)
# Head is larger than the body, with a rounded chin and slightly flattened top.
HEAD_CENTER=Vector((0,-.007,1.602))
HEAD_SCALE=Vector((.542,.416,.444))
egg('Tête · surface lisse',HEAD_CENTER,HEAD_SCALE,SKIN,48,30)

# A continuous hair cap, fitted to the skull surface. The lower contour makes
# an asymmetric fringe rather than floating sausage-like locks or eyebrows.
vertices=[];faces=[]
longitude=48;latitude=14
for j in range(latitude+1):
    f=j/latitude
    for i in range(longitude+1):
        phi=math.tau*i/longitude
        forward=max(0.,-math.sin(phi))
        edge=1.30 + .105*forward + .055*forward*math.cos(phi*2.0+0.35)
        theta=.003 + (edge-.003)*f
        st=math.sin(theta)
        vertices.append((HEAD_CENTER.x+HEAD_SCALE.x*1.010*st*math.cos(phi),
                         HEAD_CENTER.y+HEAD_SCALE.y*1.016*st*math.sin(phi),
                         HEAD_CENTER.z+HEAD_SCALE.z*1.013*math.cos(theta)))
for j in range(latitude):
    for i in range(longitude):
        a=j*(longitude+1)+i
        faces.append((a,a+longitude+1,a+longitude+2,a+1))
mesh=bpy.data.meshes.new('Hair cap mesh')
mesh.from_pydata(vertices,[],faces);mesh.update()
o=bpy.data.objects.new('Cheveux · coque ajustée',mesh)
collection.objects.link(o);o.parent=root;o.data.materials.append(HAIR)
for f in o.data.polygons:f.use_smooth=True

# Face details are shallow surface accents, never large extruded toy googly eyes.
for side,name in ((-1,'G'),(1,'D')):
    x=side*.211
    # Estimated front surface of an ellipsoid at this x and z is y ~ -.385.
    egg('Contour oeil · '+name,(x,-.390,1.627),(.096,.012,.125),EYE_OUT,24,16)
    egg('Blanc oeil · '+name,(x,-.401,1.628),(.088,.012,.116),EYE_WHITE,24,16)
    egg('Iris · '+name,(x+.008,-.414,1.621),(.055,.009,.083),IRIS,24,16)
    egg('Pupille · '+name,(x+.011,-.422,1.625),(.036,.007,.061),PUPIL,24,16)
    egg('Reflet · '+name,(x-.011,-.432,1.667),(.016,.006,.022),GLINT,16,12)
    # Barely visible flushed cheeks: flat soft ellipses, no sphere attached.
    egg('Blush · '+name,(side*.384,-.278,1.466),(.091,.007,.043),CHEEK,24,12)
# The nose is a tiny terracotta button close to the face.
egg('Nez discret',(0,-.434,1.515),(.047,.023,.037),NOSE,20,14)

# A single shallow smiling line lies on the cheeks, converted to a mesh for GLB.
curve=bpy.data.curves.new('Ligne du sourire','CURVE')
curve.dimensions='3D';curve.bevel_depth=.009;curve.bevel_resolution=3
spline=curve.splines.new('POLY');spline.points.add(18)
for k in range(19):
    u=k/18;x=(u-.5)*.217
    z=1.444-.029*math.sin(math.pi*u)
    y=-.389+ .010*abs(x)/.11
    spline.points[k].co=(x,y,z,1)
smile=bpy.data.objects.new('Sourire fin',curve)
collection.objects.link(smile);smile.parent=root;curve.materials.append(MOUTH)
bpy.ops.object.select_all(action='DESELECT');smile.select_set(True)
bpy.context.view_layer.objects.active=smile
bpy.ops.object.convert(target='MESH')

# Small soft straw hat: soft low crown and a thin brim, not an oversized tower.
cylinder('Chapeau · bord',(0,.001,2.075),.582,.040,HAT,40)
cylinder('Chapeau · couronne',(0,.003,2.181),.384,.192,HAT,36,radius_top=.339)
cylinder('Chapeau · ruban',(0,.003,2.108),.391,.032,HAT_BAND,36)

# The exported GLB only contains the character. Studio objects are separate.
bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects: obj.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(GLB),export_format='GLB',use_selection=True,
                          export_cameras=False,export_lights=False)
print('EXPORT GLB:',GLB)

# Clinical review: three consistent orthographic views, plain background,
# no platter, no UI and no other assets to distract from silhouette.
scene=bpy.context.scene
STUDIO_FLOOR=mat('Studio · fond mat',0xEEECE4)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.015))
floor=bpy.context.object;floor.name='STUDIO · sol neutre';floor.data.materials.append(STUDIO_FLOOR)
scene.world.color=(.87,.87,.84)
bpy.ops.object.camera_add()
camera=bpy.context.object;camera.name='STUDIO · camera';scene.camera=camera
camera.data.type='ORTHO';camera.data.ortho_scale=3.45
scene.render.engine='BLENDER_WORKBENCH'
scene.display.shading.light='STUDIO'
scene.display.shading.color_type='MATERIAL'
scene.display.shading.show_shadows=True
scene.display.shading.show_cavity=True
scene.display.shading.cavity_type='BOTH'
scene.render.resolution_x=850;scene.render.resolution_y=920
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
views={'front':(0,-6.1,2.6),'three-quarter':(3.8,-4.6,2.75),'side':(6,0,2.6)}
for name,position in views.items():
    camera.location=position
    focus=Vector((0,0,1.14))
    camera.rotation_euler=(focus-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(REVIEW / f'v037-{name}.png')
    bpy.ops.render.render(write_still=True)
    print('CAPTURE:',scene.render.filepath)
scene.render.filepath=''
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND),compress=True)
print('BLEND EDITABLE:',BLEND)
