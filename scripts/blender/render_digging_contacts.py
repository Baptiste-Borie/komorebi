"""Read-only diagnostic renders, native glTF shaft poses and camera witnesses.
Rendered pixels are annotated by report_digging_contacts.mjs as scientific figures.
"""
import bpy
import gzip
import importlib.util
import json
import math
from pathlib import Path

from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'reviews/digging-contact-diagnostic'
spec=importlib.util.spec_from_file_location('verify',Path(__file__).with_name('verify_digging.py'))
verify=importlib.util.module_from_spec(spec);spec.loader.exec_module(verify)
analysis=json.loads((OUT/'analysis.json').read_text())
native=json.load(gzip.open(OUT/'native-samples.json.gz','rt'))
rig,meshes,rest,H,duration=verify.load(verify.MODELS['ranger'])
def up(p):return Vector((p[0],-p[2],p[1]))
verify.frame(rig,0)
shift=(rig.matrix_world@rig.pose.bones['handslot.r'].matrix).translation-up(native['samples'][0]['hands']['r']['slot_matrix'][12:15])
def world(p):return up(p)+shift
maximum_alignment=0.
for sample in native['samples']:
    verify.frame(rig,sample['time_s'])
    for side in ('r','l'):
        for key,bone in [('slot_matrix','handslot.'+side),('hand_matrix','hand.'+side)]:
            actual=(rig.matrix_world@rig.pose.bones[bone].matrix).translation
            expected=world(sample['hands'][side][key][12:15])
            maximum_alignment=max(maximum_alignment,(actual-expected).length/H)
assert maximum_alignment<1e-4,maximum_alignment
scene=bpy.context.scene
scene.render.engine='BLENDER_WORKBENCH'
scene.render.resolution_x=1000;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL'
scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True
scene.display.shading.background_type='WORLD'
scene.world=bpy.data.worlds.new('ContactDiagnosticWorld');scene.world.color=(.72,.74,.70)
for obj in meshes:
    for mat in obj.data.materials:
        if mat:mat.diffuse_color=(.53,.58,.56,1)
proxies={}
for obj in meshes:
    data=obj.data.copy()
    proxy=bpy.data.objects.new('Diagnostic evaluated '+obj.name,data)
    scene.collection.objects.link(proxy)
    obj.hide_render=True
    proxies[obj.name]=proxy
def material(name,color):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
wood=material('Diagnostic wood',(.48,.24,.07));steel=material('Diagnostic steel',(.13,.28,.33))
bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=1,depth=1)
shaft=bpy.context.object;shaft.name='Diagnostic shaft';shaft.data.materials.append(wood)
bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=1,depth=1)
collar=bpy.context.object;collar.name='Diagnostic collar';collar.data.materials.append(steel)
blade_data=bpy.data.meshes.new('Diagnostic blade');blade_data.from_pydata([(0,0,0)]*7,[],[tuple(range(7))])
blade=bpy.data.objects.new('Diagnostic blade',blade_data);scene.collection.objects.link(blade);blade.data.materials.append(steel)
cam_data=bpy.data.cameras.new('Diagnostic camera');cam=bpy.data.objects.new('Diagnostic camera',cam_data);scene.collection.objects.link(cam)
scene.camera=cam;cam_data.type='ORTHO'
bpy.ops.mesh.primitive_plane_add(size=20,location=(0,0,-.002))
floor=bpy.context.object;floor.data.materials.append(material('Ground',(.57,.64,.48)))
configs=analysis['configs'];specs=[]
for config,key in [('baseline_synthetic','historical_fixed_marker_error_H'),('baseline_synthetic','right_surface_shaft_gap_H'),('legacy_zero_pitch','left_surface_shaft_gap_H')]:
    specs.append((config,configs[config]['summary'][key]['max_index'],'maximum-'+key))
for percent in (0,23.81,59.52,85.71,100):
    index=min(range(len(native['samples'])),key=lambda i:abs(native['samples'][i]['percent']-percent))
    specs.append(('legacy_pitch_175',index,'phase'))
# Same instant, three configurations: isolate mount error from animation.
index=configs['baseline_synthetic']['summary']['historical_fixed_marker_error_H']['max_index']
for config in ('legacy_zero_pitch','legacy_pitch_175'):
    specs.append((config,index,'same-pose-comparison'))
index=configs['legacy_zero_pitch']['summary']['left_surface_shaft_gap_H']['max_index']
specs.append(('legacy_pitch_175',index,'zero-pitch-gap-comparison'))
captures=[]
for config,index,reason in specs:
    sample=native['samples'][index];verify.frame(rig,sample['time_s'])
    # Bake the evaluated coordinates into diagnostic-only display objects.
    # Workbench background renders can otherwise reuse stale armature batches.
    for obj in meshes:
        positions=verify.points(obj)
        proxy=proxies[obj.name]
        assert len(proxy.data.vertices)==len(positions)
        proxy.data.vertices.foreach_set('co',positions.reshape(-1))
        proxy.data.update()
    entry=configs[config];w=entry['witnesses'][index]
    a,b=world(w['shaft_a']),world(w['shaft_b'])
    shaft.location=(a+b)*.5;shaft.rotation_mode='QUATERNION';shaft.rotation_quaternion=(b-a).to_track_quat('Z','Y')
    shaft.scale=(w['shaft_radius'],w['shaft_radius'],(b-a).length)
    # The rendered silhouette is dimensioned like gardeningSpade.ts for legacy
    # configurations; the baseline uses its original diagnostic triangular blade.
    if config.startswith('legacy'):
        from mathutils import Matrix
        theta=math.radians(entry['setup'].get('pitch_deg',0));rotation=Matrix.Rotation(theta,3,'X')
        outline=[(-.17,-.62,0),(.17,-.62,0),(.165,-.75,0),(.12,-.87,0),(0,-1.02,0),(-.12,-.87,0),(-.165,-.75,0)]
        native_m=verify.np.array(sample['hands']['r']['slot_matrix']).reshape(4,4,order='F')
        collar.hide_render=False
        collar_local=rotation@Vector((0,-.55,0))+Vector((0,-.05,0))
        collar.location=world(native_m[:3,:3]@verify.np.array(collar_local)+native_m[:3,3])
        collar.rotation_mode='QUATERNION';collar.rotation_quaternion=(b-a).to_track_quat('Z','Y')
        collar.scale=(.041,.041,.16)
        vertices=[]
        for point in outline:
            local=rotation@Vector(point)+Vector((0,-.05,0))
            p=native_m[:3,:3]@verify.np.array(local)+native_m[:3,3]
            vertices.append(world(p))
    else:
        collar.hide_render=True
        direction=(b-a).normalized();lateral=direction.cross(Vector((0,0,1)))
        if lateral.length<.01:lateral=direction.cross(Vector((1,0,0)))
        lateral.normalize();tip=b+direction*H*.55*.3
        vertices=[b-lateral*H*.075,b+lateral*H*.075,tip,tip,tip,tip,tip]
    for vertex,p in zip(blade_data.vertices,vertices):vertex.co=p
    for view in ('ensemble','mains'):
        if view=='ensemble':
            target=Vector((-.10,-.13,H*.48));cam_data.ortho_scale=H*1.5
            direction=Vector((.8,-1,.4))
        else:
            centers=[world(w['hands'][s]['hand_centroid']) for s in ('r','l')]
            target=sum(centers,Vector())*.5;cam_data.ortho_scale=max(H*.55,(centers[0]-centers[1]).length*1.6)
            direction=Vector((.5,-1,.4))
        cam.location=target+direction.normalized()*H*4
        cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
        bpy.context.view_layer.update()
        name=f'{config}-{index:03d}-{view}'
        scene.render.filepath=str(OUT/f'{name}-raw.png');bpy.ops.render.render(write_still=True)
        def project(point):
            p=world_to_camera_view(scene,cam,world(point))
            return [float(p.x*1000),float((1-p.y)*800)]
        marks={side:{k:project(p) for k,p in hand.items()} for side,hand in w['hands'].items()}
        captures.append(dict(name=name,config=config,index=index,time_s=sample['time_s'],percent=sample['percent'],view=view,reason=reason,
            projected=marks,shaft=[project(w['shaft_a']),project(w['shaft_b'])],row=entry['rows'][index]))
(OUT/'captures.json').write_text(json.dumps({'native_blender_alignment_max_H':maximum_alignment,'captures':captures},indent=2)+'\n')
print('CONTACT_RENDERS_COMPLETE',len(captures),'alignment_H',maximum_alignment,flush=True)
