"""Komorebi V0.44 — first real skinned Blender rig and three shovel action clips.
Reads committed v043 source. Blender -b --python-exit-code 1 --python <this-file>
Output directory is KOMOREBI_V044_OUTPUT; base repository = cwd.
"""
import bpy, json, math, os, sys
from pathlib import Path
from mathutils import Vector

ROOT=Path.cwd()
BASE=ROOT/'assets/characters/gardener-v043.blend'
OUT=Path(os.environ.get('KOMOREBI_V044_OUTPUT',str(ROOT/'reviews/character-lab/v044')))
OUT.mkdir(parents=True,exist_ok=True)
GLB=OUT/'gardener-v044.glb'; BLEND=OUT/'gardener-v044.blend'
if not BASE.is_file():raise RuntimeError('V0.44: fichier Blender V0.43 manquant')
bpy.ops.wm.open_mainfile(filepath=str(BASE))
bpy.context.preferences.filepaths.save_version=0
model=bpy.data.collections.get('GARDENER • editable surfaces')
root=bpy.data.objects.get('Gardener_STATIC')
if model is None or root is None:raise RuntimeError('V0.44: V0.43 invalide (collection/racine)')
def get(name):
 o=bpy.data.objects.get(name)
 if o is None or o.type!='MESH' or name not in model.objects:raise RuntimeError('V0.44: maillage manquant: '+name)
 return o
# Last static polish: do not remodel validated face, head, ears, boots, hat or trousers.
shirt=get('Shirt • shaped shoulder and torso mesh')
for v in shirt.data.vertices:
 x,y,z=v.co
 if .68 < z < .84:
  t=max(0.,min(1.,(.84-z)/.16))
  # Bury the hem *inside* the waistband with a continuous falloff.
  v.co.x*=1-.036*t
  v.co.y=.015+(y-.015)*(1-.042*t)
shirt.data.update()
for name in ('Sleeve -1','Sleeve 1'):
 o=get(name)
 for v in o.data.vertices:
  x,y,z=v.co; inner=max(0.,min(1.,(1.12-z)/.16))
  # Subtle taper at arm exit, and an inset at the shoulder cap.
  v.co.x=x-(1 if x>0 else -1)*(.010*(1-inner))
  v.co.y=-.02+(y+.02)*(.967+.018*inner)
 o.data.update()

# Create a real armature with separate upper/lower arm and leg bones.
arm_data=bpy.data.armatures.new('KomorebiRig_DATA')
rig=bpy.data.objects.new('KomorebiRig',arm_data);model.objects.link(rig);rig.parent=root
bpy.context.view_layer.objects.active=rig;rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
E=arm_data.edit_bones
def bone(name,head,tail,parent=None,connected=False):
 b=E.new(name);b.head=head;b.tail=tail
 if parent:b.parent=E[parent];b.use_connect=connected
 return b
bone('Root',(0,0,.02),(0,0,.50))
bone('Torso',(0,0,.50),(0,0,1.17),'Root')
bone('Head',(0,0,1.20),(0,0,1.79),'Torso')
for side,s in [('L',1),('R',-1)]:
 bone('UpperArm.'+side,(s*.40,-.02,1.065),(s*.535,-.03,.84),'Torso')
 bone('ForeArm.'+side,(s*.535,-.03,.84),(s*.54,-.035,.635),'UpperArm.'+side)
 bone('Leg.'+side,(s*.186,.01,.51),(s*.186,.015,.20),'Root')
bone('Shovel',(0,-.57,.78),(0,-.57,1.23),'Root')
bpy.ops.object.mode_set(mode='OBJECT')
# Don't display rig widgets in character studio; bones still export and animate.
rig.show_in_front=False

# Infer weights from the original editable KayKit-derived mesh surfaces.
# Vertices at the elbow blend smoothly between the upper/lower arm bones.
head_keys=('Face and ears','Hair ','Brows ','Eyes ','Smile ','Straw ','Hat ','Straw brim','Straw crown')
def blend(x,a,b):
 t=max(0.,min(1.,(x-a)/(b-a)))
 return t*t*(3-2*t)
mesh_objects=[o for o in list(model.objects) if o.type=='MESH']
for o in mesh_objects:
 for group in list(o.vertex_groups):o.vertex_groups.remove(group)
 def weight(bone_name,vi,w):
  if w<=.00001:return
  vg=o.vertex_groups.get(bone_name) or o.vertex_groups.new(name=bone_name)
  vg.add([vi],w,'REPLACE')
 n=o.name
 if n.startswith('Tool |'):
  for v in o.data.vertices:weight('Shovel',v.index,1)
 elif n.startswith(head_keys) or n in ('Neck • tucked into collar',):
  bn='Head' if n!='Neck • tucked into collar' else 'Torso'
  for v in o.data.vertices:weight(bn,v.index,1)
 elif n.startswith(('Arm ','Sleeve ','Folded cuff')):
  for v in o.data.vertices:
   x,y,z=v.co;s='L' if x>=0 else 'R'
   # Lower mesh vertex Z corresponds to lower arm, wrist and hand.
   t=blend(z,.69,.94)
   if n.startswith(('Sleeve ','Folded cuff')):t=max(t,.88)
   weight('UpperArm.'+s,v.index,t)
   weight('ForeArm.'+s,v.index,1-t)
 elif n.startswith('Boot '):
  for v in o.data.vertices:weight('Leg.'+('L' if v.co.x>=0 else 'R'),v.index,1)
 elif n.startswith('Overalls • continuous'):
  for v in o.data.vertices:
   t=1-blend(v.co.z,.32,.55)
   weight('Root',v.index,1-t)
   weight('Leg.'+('L' if v.co.x>=0 else 'R'),v.index,t)
 else:
  for v in o.data.vertices:weight('Torso',v.index,1)
 mod=o.modifiers.get('Komorebi skeleton') or o.modifiers.new('Komorebi skeleton','ARMATURE')
 mod.object=rig

# Single ergonomic garden spade with a genuine scoop and continuous wooden shaft.
def mat(name,rgb):
 m=bpy.data.materials.get(name)
 if m:return m
 m=bpy.data.materials.new(name);m.use_nodes=True
 m.diffuse_color=(*rgb,1);m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*rgb,1)
 m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.84
 return m
wood=mat('Tool wood',(.45,.29,.16));metal=mat('Tool metal',(.30,.39,.40))
soilmat=mat('Tool earth',(.33,.22,.13))
def toolmesh(name,verts,faces,material):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new('Tool | '+name,mesh);model.objects.link(o);o.parent=root
 mesh.materials.append(material)
 for poly in mesh.polygons:poly.use_smooth=False
 vg=o.vertex_groups.new(name='Shovel');vg.add(list(range(len(verts))),1,'REPLACE')
 m=o.modifiers.new('Komorebi skeleton','ARMATURE');m.object=rig
 return o
# Shaft with eight sides, matches height and mass of the little gardener.
def shaft(name,z1,z2,r,material):
 verts=[];n=10
 for z in (z1,z2):
  for i in range(n):
   a=math.tau*i/n;verts.append((r*math.cos(a),-.57+r*math.sin(a),z))
 faces=[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 faces.extend([tuple(reversed(range(n))),tuple(n+i for i in range(n))]);return toolmesh(name,verts,faces,material)
shaft('wood shaft',.32,1.39,.032,wood)
shaft('steel collar',.32,.46,.044,metal)
# A slightly cupped shovel blade (not a flat tiny triangle).
rows=[(.35,.10,-.58),(.24,.19,-.60),(.08,.17,-.645),(-.09,.10,-.655),(-.20,.01,-.62)]
verts=[]
for z,w,dep in rows:verts.extend([(-w,dep,z),(0,dep-.018,z),(w,dep,z)])
faces=[]
for k in range(len(rows)-1):
 a=3*k;faces.extend([(a,a+1,a+4,a+3),(a+1,a+2,a+5,a+4)])
blade=toolmesh('curved steel spade',verts,faces,metal)
# Small soil chunks rest in the upward-facing scoop before pouring.
for k in range(4):
 x=(k-1.5)*.075;y=-.656;z=.15+.05*(k%2)
 v=[(x-.035,y,z-.03),(x+.035,y,z-.03),(x,y-.025,z+.028),(x,y+.04,z+.03)]
 toolmesh('soil chunk '+str(k),v,[(0,1,2),(0,3,1),(1,3,2),(2,3,0)],soilmat)

# Short legible actions: torso anticipation, elbow flexion and tool-to-soil contact.
rig.animation_data_create()
rest={'dig':[
 # (frame, shovel-Z, shovel local twist, shovel-pitch, upper arm pitch, forearm pitch, head pitch, torso pitch)
 (1,.18,0,.02,-.72,-.38,.00,0),
 (8,-.05,0,-.08,-.87,-.53,.045,.09),
 (14,-.42,0,-.24,-1.02,-.65,.08,.17),
 (19,-.42,0,.04,-.91,-.55,.08,.16),
 (29,.20,0,.32,-.58,-.76,-.015,-.05),
 (37,.28,-.17,.25,-.52,-.68,-.035,-.055),
 (46,.18,0,.02,-.72,-.38,0,0)],
 'fill':[(1,.18,0,0,-.70,-.47,0,0),(9,.11,0,0,-.72,-.45,0,0),
 (16,.04,.20,-.04,-.74,-.52,0,.04),(27,.02,1.50,-.08,-.74,-.54,.02,.07),
 (36,.08,1.45,-.05,-.69,-.48,0,.025),(44,.18,0,0,-.70,-.47,0,0)],
 'level':[(1,.30,0,0,-.67,-.53,0,0),(8,.05,0,.12,-.83,-.52,.02,.055),
 (11,-.10,0,.12,-.91,-.56,.035,.075),(16,.24,0,.05,-.68,-.42,0,0),
 (24,-.10,0,.12,-.91,-.56,.035,.075),(31,.28,0,0,-.67,-.53,0,0)]}
end_frames={}
for action_name,poses in rest.items():
 act=bpy.data.actions.new('KOMOREBI_'+action_name)
 rig.animation_data.action=act
 for frame,dz,twist,pitch,upper,fore,head,torso in poses:
  for pb in rig.pose.bones:
   pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
  pb=rig.pose.bones
  pb['Shovel'].location.z=dz
  pb['Shovel'].rotation_euler=(pitch,twist,0)
  pb['Torso'].rotation_euler=(torso,0,0)
  pb['Head'].rotation_euler=(head,0,0)
  for s,sign in [('L',1),('R',-1)]:
   pb['UpperArm.'+s].rotation_euler=(upper,0,sign*.12)
   pb['ForeArm.'+s].rotation_euler=(fore,0,sign*.075)
  for bn in ['Shovel','Torso','Head','UpperArm.L','UpperArm.R','ForeArm.L','ForeArm.R']:
   pb[bn].keyframe_insert(data_path='rotation_euler',frame=frame,group=bn)
   if bn=='Shovel':pb[bn].keyframe_insert(data_path='location',frame=frame,group=bn)
 bpy.context.scene.frame_end=poses[-1][0]
 track=rig.animation_data.nla_tracks.new();track.name=action_name
 strip=track.strips.new(action_name,1,act)
 strip.action_frame_start=1;strip.action_frame_end=poses[-1][0]
 end_frames[action_name]=poses[-1][0]
 rig.animation_data.action=None
# Stop NLA tracks from simultaneously driving the same rig in the editor.
for track in rig.animation_data.nla_tracks:track.mute=True
root['version']='0.44';root['notes']='Blender armature, skin weights, three garden-tool actions'
rig['rig_version']='0.44'
# Export NLA strips, not one merged active action. Return NLA tracks to active.
for track in rig.animation_data.nla_tracks:track.mute=False
bpy.context.scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for o in model.objects:o.select_set(True)
bpy.context.view_layer.objects.active=rig
props=bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
export_options=dict(filepath=str(GLB),export_format='GLB',use_selection=True,
 export_animations=True,export_cameras=False,export_lights=False,export_extras=True)
if 'export_animation_mode' in props:export_options['export_animation_mode']='NLA_TRACKS'
else:export_options['export_nla_strips']=True
bpy.ops.export_scene.gltf(**export_options)
if not GLB.is_file() or GLB.stat().st_size<50000:raise RuntimeError('V0.44: GLB animé manquant ou trop petit')
# Save an editable rig with the review camera; the studio is not exported.
for track in rig.animation_data.nla_tracks:track.mute=True
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND),compress=True)
report={'version':'0.44','base':'gardener-v043.blend','animations':end_frames,'bone_count':len(rig.data.bones),'mesh_count':len(mesh_objects),'glb_bytes':GLB.stat().st_size}
(OUT/'asset-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('KOMOREBI_V044_OK',json.dumps(report))
