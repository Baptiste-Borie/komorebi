"""Komorebi V0.38 static gardener, adapted from KayKit Rogue 1.0 CC0.
blender -b --python-exit-code 1 --python scripts/blender/build_gardener_v038.py
Optional after --: --draft / --no-render. No rig or animation exported.
"""
import bpy,bmesh,math,json,sys,hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/characters/sources/kaykit/Rogue.glb'
BLEND=ROOT/'assets/characters/gardener-v038.blend'
GLB=ROOT/'public/assets/gardener-v038.glb'
REVIEW=ROOT/'reviews/character-lab/v038'
DRAFT='--draft' in sys.argv
for p in (BLEND.parent,GLB.parent,REVIEW):p.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.import_scene.gltf(filepath=str(SOURCE),import_pack_images=True)
for o in bpy.data.objects:
 if o.type=='ARMATURE':o.animation_data_clear();o.data.pose_position='REST'
bpy.context.view_layer.update()
sources={}
for name in ['Rogue_Head','Rogue_ArmLeft','Rogue_LegLeft']:
 o=bpy.data.objects[name];uv=o.data.uv_layers.active.data
 sources[name]={'verts':[tuple(o.matrix_world@v.co) for v in o.data.vertices],
 'faces':[tuple(p.vertices) for p in o.data.polygons],
 'tiles':[int(sum(uv[i].uv.x for i in p.loop_indices)/len(p.loop_indices)*8) for p in o.data.polygons],
 'edges':[tuple(e.vertices) for e in o.data.edges]}
for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
for m in list(bpy.data.materials):bpy.data.materials.remove(m)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
for c in list(bpy.data.collections):bpy.data.collections.remove(c)
model=bpy.data.collections.new('GARDENER • editable surfaces');bpy.context.scene.collection.children.link(model)
root=bpy.data.objects.new('Gardener_STATIC',None);model.objects.link(root)
root['provenance']='Adapted KayKit Rogue 1.0 / Kay Lousberg / CC0; original Komorebi garments and hat'
root['version']='0.38'
def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
def material(name,hexcolor,roughness=.82):
 m=bpy.data.materials.new(name);m.diffuse_color=tuple(linear((hexcolor>>s&255)/255) for s in (16,8,0))+(1,);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=m.diffuse_color;p.inputs['Roughness'].default_value=roughness
 return m
skin=material('Skin • warm peach',0xE4AD83);hair=material('Hair • chestnut',0x654332)
eyes=material('Eyes • soft black',0x222620,.65);lip=material('Smile • warm umber',0x704431)
shirt=material('Shirt • warm linen',0xE5DBC0);cuff=material('Linen • folded edge',0xD2C7AC)
denim=material('Overalls • garden green',0x527563);seam=material('Overalls • stitched edge',0x78927B)
leather=material('Boots • chestnut leather',0x76513D);sole=material('Boots • sole and welt',0x493D31)
straw=material('Hat • golden straw',0xC7A368);ribbon=material('Hat • olive ribbon',0x69734F);brass=material('Buttons • aged brass',0xB69755,.65)
def mesh(name,verts,faces,mat,smooth=True):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);model.objects.link(o);o.parent=root;me.materials.append(mat)
 for p in me.polygons:p.use_smooth=smooth
 return o
def weld(o):
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00002);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
def apply(o,mod):
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False)
def subd(o,levels=1):
 mod=o.modifiers.new('Surface refinement','SUBSURF');mod.levels=levels;apply(o,mod)
def shell(o,thickness=.008):
 mod=o.modifiers.new('Real garment thickness','SOLIDIFY');mod.thickness=thickness;mod.offset=0;apply(o,mod)
def extracted(name,data,selected,mat,transform=lambda v:v):
 faces=[data['faces'][i] for i in selected];ids=sorted(set(v for f in faces for v in f));index={v:i for i,v in enumerate(ids)}
 return mesh(name,[transform(Vector(data['verts'][v])) for v in ids],[tuple(index[v] for v in f) for f in faces],mat)
def components(bm):
 seen=set()
 for start in bm.verts:
  if start in seen:continue
  stack=[start];part=[];seen.add(start)
  while stack:
   v=stack.pop();part.append(v)
   for e in v.link_edges:
    q=e.other_vert(v)
    if q not in seen:seen.add(q);stack.append(q)
  yield part
# Sculpted head, ears and jaw: actual inherited topology, not sphere primitives.
h=sources['Rogue_Head']
face=extracted('Face and ears • adapted KayKit topology',h,[i for i,t in enumerate(h['tiles']) if t==0],skin)
for v in face.data.vertices:
 x,y,z=v.co
 if abs(x)<.09 and y<-.455 and 1.43<z<1.65:v.co.y=-.455+(y+.455)*.58
weld(face)
bm=bmesh.new();bm.from_mesh(face.data)
for part in components(bm):
 if len(part)<50 and max(abs(v.co.x) for v in part)<.10:
  for v in part:v.co.x*=.82;v.co.z=1.54+(v.co.z-1.54)*.86;v.co.y+=.009
bm.to_mesh(face.data);bm.free()
face_bvh=BVHTree.FromPolygons([v.co for v in face.data.vertices],[p.vertices[:] for p in face.data.polygons])
def face_y(x,z):
 hit=face_bvh.ray_cast(Vector((x,-2,z)),Vector((0,1,0)))
 return hit[0].y if hit[0] else -.425
eye=extracted('Eyes • refitted black KayKit meshes',h,[i for i,t in enumerate(h['tiles']) if t==2],eyes)
for v in eye.data.vertices:
 s=1 if v.co.x>0 else -1;cx=s*.205;dx=(v.co.x-cx)/.062;dz=(v.co.z-1.6064)/.0632
 angle=math.atan2(dz,dx);rad=min(1.,math.hypot(dx,dz));rad=1 if rad>.72 else rad/.72
 x=cx+.054*math.cos(angle)*rad;z=1.609+.080*math.sin(angle)*rad
 v.co=(x,face_y(x,z)-.006-.014*(1-rad*rad),z)
weld(eye)
hair_obj=extracted('Hair • shortened swept cut and brows',h,[i for i,t in enumerate(h['tiles']) if t==1],hair)
for v in hair_obj.data.vertices:
 x,y,z=v.co
 if z<1.50:v.co.z=1.29+(z-1.1655)*.55
 if z>1.88:
  r=math.sqrt((x/.432)**2+((y-.015)/.402)**2);blend=min(1.,(z-1.88)/.075);scale=1+(min(1.,1/max(r,.001))-1)*blend
  v.co.x=x*scale;v.co.y=.015+(y-.015)*scale
 if y<-.28 and z<1.72 and abs(x)>.30:v.co.z=max(v.co.z,1.61+(z-1.1655)*.17)
weld(hair_obj)
bm=bmesh.new();bm.from_mesh(hair_obj.data)
for part in components(bm):
 if len(part)<65 and min(v.co.z for v in part)>1.67 and max(v.co.z for v in part)<1.79:
  for v in part:
   x=v.co.x;u=(abs(x)-.20)/.11;v.co.z=1.735+.019*(1-u*u)+(v.co.z-1.73)*.32
bm.to_mesh(hair_obj.data);bm.free()
def line(name,points,mat,radius=.003):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=1;cu.bevel_depth=radius;cu.bevel_resolution=1
 sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
 for p,co in zip(sp.points,points):p.co=(*co,1)
 o=bpy.data.objects.new(name,cu);model.objects.link(o);o.parent=root;cu.materials.append(mat)
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o
line('Smile • surface fitted',[(x,face_y(x,1.397+.021*(x/.11)**2)-.004,1.397+.021*(x/.11)**2) for x in [-.11+i*.22/20 for i in range(21)]],lip,.005)
# Shaped torso and continuous bifurcating pants.
P=2.6
sections=[(.48,.32,.235),(.54,.365,.260),(.68,.385,.280),(.82,.368,.274),(.98,.330,.255),(1.10,.290,.226),(1.155,.205,.165),(1.175,.120,.115)]
def signedpow(v,e):return math.copysign(abs(v)**e,v)
def profile(z):
 for (a,rx,ry),(b,sx,sy) in zip(sections,sections[1:]):
  if a<=z<=b:
   t=(z-a)/(b-a);return rx+(sx-rx)*t,ry+(sy-ry)*t
 return sections[0][1:] if z<sections[0][0] else sections[-1][1:]
def cross(rx,ry,a,z):return (rx*signedpow(math.cos(a),2/P),.015+ry*signedpow(math.sin(a),2/P),z)
def loft(name,rings,mat,n=24,caps=True,smooth=True):
 verts=[cross(rx,ry,math.tau*i/n,z) for z,rx,ry in rings for i in range(n)];faces=[]
 for j in range(len(rings)-1):
  for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
 if caps:faces += [tuple(reversed(range(n))),tuple((len(rings)-1)*n+i for i in range(n))]
 o=mesh(name,verts,faces,mat,smooth);weld(o);return o
body=loft('Shirt • shaped shoulder and torso mesh',sections,shirt);subd(body)
for v in body.data.vertices:
 t=max(0.,min(1.,(.84-v.co.z)/.10));v.co.x*=1-.13*t;v.co.y=.015+(v.co.y-.015)*(1-.13*t)
neck=loft('Neck • tucked into collar',[(1.13,.112,.108),(1.22,.13,.12),(1.31,.14,.13)],skin,16)
n=16;verts=[];faces=[]
for z,rx,ry in [(.77,.382,.282),(.72,.390,.289),(.56,.377,.275),(.44,.338,.235)]:verts += [cross(rx,ry,math.tau*i/n,z) for i in range(n)]
for j in range(3):
 for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
crotch=[]
for y,z in [(.13,.405),(.015,.385),(-.10,.405)]:crotch.append(len(verts));verts.append((0,y,z))
for side in [1,-1]:
 old=[48+i for i in ([12,13,14,15,0,1,2,3,4] if side==1 else [4,5,6,7,8,9,10,11,12])]+(crotch if side==1 else list(reversed(crotch)))
 angles=[-90,-67.5,-45,-22.5,0,22.5,45,67.5,90,135,180,225]
 if side==-1:angles=[a+180 for a in angles]
 for z,rx,ry in [(.35,.153,.150),(.265,.148,.142)]:
  new=[]
  for deg in angles:
   a=math.radians(deg);new.append(len(verts));verts.append((side*.184+rx*math.cos(a),.015+ry*math.sin(a),z))
  for i in range(12):faces.append((old[i],old[(i+1)%12],new[(i+1)%12],new[i]))
  old=new
 faces.append(tuple(reversed(old)))
faces.append(tuple(range(16)))
pants=mesh('Overalls • continuous waist seat crotch and legs',verts,faces,denim);weld(pants);subd(pants)
bpy.context.view_layer.update();body_bvh=BVHTree.FromPolygons([v.co for v in body.data.vertices],[p.vertices[:] for p in body.data.polygons])
def torso_y(x,z,front=True):
 hit=body_bvh.ray_cast(Vector((x,-2 if front else 2,z)),Vector((0,1 if front else -1,0)))
 if hit[0]:return hit[0].y+(-.010 if front else .010)
 rx,ry=profile(z);return .015+(-1 if front else 1)*ry*max(0,1-(abs(x)/rx)**P)**(1/P)
def panel(name,zrows,widths,mat,offset=.004,n=8):
 vs=[];fs=[]
 for z,w in zip(zrows,widths):
  for i in range(n+1):
   x=-w+2*w*i/n;vs.append((x,torso_y(x,z)-offset,z))
 for j in range(len(zrows)-1):
  for i in range(n):a=j*(n+1)+i;fs.append((a,a+1,a+n+2,a+n+1))
 o=mesh(name,vs,fs,mat);shell(o,.008);return o
bib=panel('Bib • fitted curved denim',[.69,.76,.84,.94,1.035,1.055],[.285,.27,.245,.224,.214,.199],denim)
for side in [-1,1]:
 vs=[];fs=[];x0=side*.185;width=.033
 route=[('front',z) for z in [1.025,1.07,1.105]]+[('top',y) for y in [-.13,-.06,.02,.10,.16]]+[('back',z) for z in [1.105,1.04,.93,.81,.75]]
 for part,v in route:
  for x in [x0-width,x0+width]:
   if part=='top':
    hit=body_bvh.ray_cast(Vector((x,v,2)),Vector((0,0,-1)));z=(hit[0].z if hit[0] else 1.15)+.011;vs.append((x,v,z))
   else:vs.append((x,torso_y(x,v,part=='front'),v))
 for j in range(len(route)-1):a=j*2;fs.append((a,a+1,a+3,a+2))
 o=mesh('Shoulder strap '+str(side),vs,fs,denim);shell(o,.009)
 bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.023,depth=.010,location=(x0,torso_y(x0,1.025)-.020,1.025),rotation=(math.pi/2,0,0))
 o=bpy.context.object;o.name='Brass bib button '+str(side)
 for c in tuple(o.users_collection):c.objects.unlink(o)
 model.objects.link(o);o.parent=root;o.data.materials.append(brass)
 line('Bib side seam '+str(side),[(side*w,torso_y(side*w,z)-.012,z) for z,w in zip([.77,.84,.94,1.035],[.255,.23,.209,.199])],seam,.0025)
pocket=panel('Pocket • fitted five-sided patch',[.808,.828,.926,.94],[.067,.113,.113,.103],denim,.014)
line('Pocket top rolled edge',[(x,torso_y(x,.933)-.021,.933) for x in [-.108,-.054,0,.054,.108]],seam,.003)
# Extend the actual KayKit wrist boundary into an anatomically connected arm.
a=sources['Rogue_ArmLeft'];parent=list(range(len(a['verts'])))
def find(i):
 while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
 return i
for i,j in a['edges']:parent[find(i)]=find(j)
groups={}
for i in range(len(a['verts'])):groups.setdefault(find(i),set()).add(i)
hand_ids=max(groups.values(),key=lambda ids:sum(a['verts'][i][0] for i in ids)/len(ids))
hand_faces=[i for i,f in enumerate(a['faces']) if set(f)<=hand_ids]
axis=Vector((.20,-.045,-.97875)).normalized();sideaxis=Vector((0,1,0));sideaxis=(sideaxis-axis*sideaxis.dot(axis)).normalized();up=axis.cross(sideaxis).normalized()
def arm_point(v):
 x,y,z=v;return Vector((.505,-.035,.715))+(x-.7678)*axis+y*sideaxis+(z-1.105)*up
hand=extracted('Arm L • KayKit hand and continuous forearm',a,hand_faces,skin);weld(hand)
bm=bmesh.new();bm.from_mesh(hand.data);boundary=[v for v in bm.verts if any(e.is_boundary for e in v.link_edges)]
boundary=sorted(boundary,key=lambda v:math.atan2(v.co.z-1.105,v.co.y))
if not boundary:raise RuntimeError('KayKit wrist boundary missing; source changed')
old=boundary
for x,scale in [(.70,.88),(.57,.91),(.46,1.02)]:
 new=[bm.verts.new((x,v.co.y*scale,1.105+(v.co.z-1.105)*scale)) for v in boundary]
 for i in range(len(old)):bm.faces.new((old[i],old[(i+1)%len(old)],new[(i+1)%len(old)],new[i]))
 old=new
bm.faces.new(tuple(reversed(old)));bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(hand.data);bm.free()
for p in hand.data.polygons:p.use_smooth=True
for v in hand.data.vertices:v.co=arm_point(v.co)
subd(hand)
other=hand.copy();other.data=hand.data.copy();other.name='Arm R • mirrored continuous forearm';model.objects.link(other)
for v in other.data.vertices:v.co.x=-v.co.x
weld(other)
for side in [1,-1]:
 for name,rings,mat in [('Sleeve',[(.34,.080),(.39,.145),(.49,.141),(.55,.130)],shirt),('Folded cuff',[(.525,.134),(.55,.139),(.575,.132)],cuff)]:
  vs=[];fs=[];n=16
  for x,r in rings:
   for i in range(n):
    t=math.tau*i/n;p=arm_point((x,math.sin(t)*r,1.105+math.cos(t)*r))
    if name=='Sleeve' and x==rings[0][0]:p.x-=.115;p.z-=.025
    p.x*=side;vs.append(p)
  for j in range(len(rings)-1):
   for i in range(n):aa=j*n+i;bb=j*n+(i+1)%n;fs.append((aa,bb,bb+n,aa+n))
  if name=='Sleeve':fs.append(tuple(reversed(range(n))))
  o=mesh(name+' '+str(side),vs,fs,mat);shell(o,.012);weld(o)
l=sources['Rogue_LegLeft']
for side in [1,-1]:
 selected=[i for i,f in enumerate(l['faces']) if max(l['verts'][j][2] for j in f)<.294]
 o=extracted('Boot '+str(side)+' • adapted KayKit mesh',l,selected,leather,lambda v:Vector((side*((v.x-.1686)*1.12+.184),v.y*1.04,v.z)))
 o.data.materials.append(sole)
 for p in o.data.polygons:
  z=sum(o.data.vertices[i].co.z for i in p.vertices)/len(p.vertices)
  if z<.04:p.material_index=1
 weld(o)
# Oval fitted hat, cambered brim, rounded crown and bound edge.
N=48;vs=[];fs=[]
def hat_ring(rx,ry,z,camber=0):
 return [(rx*math.cos(t),ry*math.sin(t)+.015,z+camber*math.cos(2*t)+.018*math.sin(t)) for t in [math.tau*i/N for i in range(N)]]
for rx,ry,z,c in [(.44,.414,1.982,0),(.50,.465,1.976,.008),(.62,.56,1.947,.018),(.713,.635,1.958,.032),(.724,.643,1.975,.033)]:vs+=hat_ring(rx,ry,z,c)
for j in range(4):
 for i in range(N):aa=j*N+i;bb=j*N+(i+1)%N;fs.append((aa,aa+N,bb+N,bb))
brim=mesh('Straw brim • cambered oval with rolled lip',vs,fs,straw);shell(brim,.014);weld(brim)
vs=[];fs=[]
for rx,ry,z,c in [(.454,.426,1.977,0),(.459,.430,2.02,0),(.440,.412,2.19,.003),(.405,.379,2.265,.003),(.357,.332,2.293,.004),(.23,.21,2.284,.008),(.07,.06,2.271,.003)]:vs+=hat_ring(rx,ry,z,c)
for j in range(6):
 for i in range(N):aa=j*N+i;bb=j*N+(i+1)%N;fs.append((aa,bb,bb+N,aa+N))
fs.append(tuple(6*N+i for i in range(N)))
crown=mesh('Straw crown • shaped shoulder and shallow top',vs,fs,straw);shell(crown,.012);weld(crown)
vs=hat_ring(.463,.434,2.003)+hat_ring(.457,.429,2.065);fs=[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)]
band=mesh('Hat ribbon • fitted olive band',vs,fs,ribbon);shell(band,.008);weld(band)
line('Hat brim bound edge',hat_ring(.719,.639,1.978,.033)+hat_ring(.719,.639,1.978,.033)[:1],straw,.005)
# Selection excludes original rig, equipment and studio.
bpy.ops.object.select_all(action='DESELECT')
for o in model.objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(GLB),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
mesh_objects=[o for o in model.objects if o.type=='MESH']
for o in mesh_objects:o.data.calc_loop_triangles()
report={'version':'0.38','blender':bpy.app.version_string,'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'objects':len(mesh_objects),'triangles':sum(len(o.data.loop_triangles) for o in mesh_objects),'animations':0,'glb_bytes':GLB.stat().st_size}
(REVIEW/'asset-report.json').write_text(json.dumps(report,indent=2)+'\n')
studio=bpy.data.collections.new('STUDIO • not exported');bpy.context.scene.collection.children.link(studio)
def studio_object(o):
 for c in tuple(o.users_collection):c.objects.unlink(o)
 studio.objects.link(o)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24 if DRAFT else 64;scene.cycles.use_denoising=True
scene.world=bpy.data.worlds.new('Soft neutral sky');scene.world.use_nodes=True;bg=scene.world.node_tree.nodes['Background'];bg.inputs[0].default_value=(.78,.83,.89,1);bg.inputs[1].default_value=.45
floor_mat=material('Studio • warm grey',0xD9D8CE)
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Studio floor';floor.data.materials.append(floor_mat);studio_object(floor)
for name,pos,power,size,col in [('Key',(-3,-4,6),450,4,(1,.94,.85)),('Fill',(4,-1,3),180,3,(.83,.91,1)),('Rim',(1,3,5),350,3,(1,1,.96))]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=col;o.rotation_euler=(Vector((0,0,1.1))-o.location).to_track_quat('-Z','Y').to_euler();studio_object(o)
bpy.ops.object.camera_add();camera=bpy.context.object;camera.name='Review camera';studio_object(camera);scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=2.85
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.render.resolution_x=800 if DRAFT else 1100;scene.render.resolution_y=900 if DRAFT else 1240;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
views={'front':(0,-7,1.5),'side':(7,0,1.5),'three-quarter':(3.4,-6,2.8),'back':(0,7,1.7)}
# Save the editable asset before rendering, so a render interruption loses no model.
camera.location=views['three-quarter'];camera.rotation_euler=(Vector((0,0,1.16))-camera.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND),compress=True)
if '--no-render' not in sys.argv:
 for name,pos in views.items():
  camera.location=pos;camera.rotation_euler=(Vector((0,0,1.16))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(REVIEW/(name+'.png'));bpy.ops.render.render(write_still=True)
camera.location=views['three-quarter'];camera.rotation_euler=(Vector((0,0,1.16))-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath='';bpy.ops.object.select_all(action='DESELECT');root.select_set(True);bpy.context.view_layer.objects.active=root
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND),compress=True)
print('ASSET_REPORT',json.dumps(report));print('BLEND',BLEND);print('GLB',GLB)
