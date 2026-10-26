"""Render the five requested Digging poses and the V0.44 comparison plate."""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
RIGGED=ROOT/'public/assets/kaykit-v045/gardener-v044-rig-medium.glb'
ORIGINAL=ROOT/'public/assets/gardener-v044.glb'
OUT=ROOT/'reviews/v044-rig-medium/final/captures'
OUT.mkdir(parents=True,exist_ok=True)


def setup_scene():
    scene=bpy.context.scene
    scene.render.engine='BLENDER_WORKBENCH'
    scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100
    scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL'
    scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    scene.world=bpy.data.worlds.new('Komorebi neutral world');scene.world.color=(.72,.74,.69)
    bpy.ops.mesh.primitive_plane_add(size=14,location=(0,0,-.003))
    ground=bpy.context.object;ground.name='Measurement ground z=0'
    material=bpy.data.materials.new('Ground');material.diffuse_color=(.54,.63,.46,1);ground.data.materials.append(material)
    data=bpy.data.cameras.new('Review camera');camera=bpy.data.objects.new('Review camera',data)
    scene.collection.objects.link(camera);scene.camera=camera;data.type='ORTHO'
    scene.render.use_stamp=True;scene.render.use_stamp_note=True
    scene.render.use_stamp_date=False;scene.render.use_stamp_time=False;scene.render.use_stamp_render_time=False
    scene.render.use_stamp_frame=False;scene.render.use_stamp_scene=False;scene.render.use_stamp_camera=False
    scene.render.use_stamp_filename=False;scene.render.use_stamp_memory=False;scene.render.use_stamp_hostname=False
    scene.render.stamp_font_size=18
    return scene,camera


def object_points(objects,evaluated=False):
    result=[]
    for obj in objects:
        if obj.type!='MESH':continue
        if evaluated:
            current=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=current.to_mesh()
            result.extend(current.matrix_world@v.co for v in mesh.vertices);current.to_mesh_clear()
        else:result.extend(obj.matrix_world@v.co for v in obj.data.vertices)
    return result


def bounds(points):
    return Vector(tuple(min(p[i] for p in points) for i in range(3))),Vector(tuple(max(p[i] for p in points) for i in range(3)))


def aim(camera,target,direction,scale):
    camera.data.ortho_scale=scale
    camera.location=target+Vector(direction).normalized()*scale*3.2
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()


def set_time(scene,time):
    value=time*scene.render.fps/scene.render.fps_base
    scene.frame_set(math.floor(value),subframe=value%1);bpy.context.view_layer.update()


views={'front':(0,-1,.10),'profile':(1,0,.10),'three-quarter':(.75,-1,.22)}
for percent in (0,20,45,80,100):
    for view,direction in views.items():
        # Workbench can lose its off-screen context after many consecutive
        # renders. Reloading the small GLB per requested plate makes all 15
        # captures deterministic in Blender background mode.
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(RIGGED))
        rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
        action=bpy.data.actions['Digging'];rig.animation_data_create();rig.animation_data.action=action
        if action.slots:rig.animation_data.action_slot=action.slots[0]
        character=[o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
        lo,hi=bounds(object_points(character));height=hi.z-lo.z;rig.location.z-=lo.z
        scene,camera=setup_scene();set_time(scene,1.4*percent/100)
        current=object_points(character,True);low,high=bounds(current);target=(low+high)*.5
        aim(camera,target,direction,height*1.55)
        scene.render.stamp_note_text=f'Digging  {percent:03d}%  |  {view}  |  V0.44 / Rig_Medium'
        scene.render.filepath=str(OUT/f'digging-{percent:03d}-{view}.png')
        bpy.ops.render.render(write_still=True)
print('V044_RENDERED',len(list(OUT.glob('digging-*.png'))),'pose plates; app review owns the side-by-side comparison')
