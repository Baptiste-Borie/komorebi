"""Import the generated GLB and save the editable Blender deliverable."""
import bpy
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'public/assets/kaykit-v045/gardener-v044-rig-medium.glb'
OUTPUT=ROOT/'assets/characters/gardener-v044-rig-medium.blend'
if not SOURCE.is_file():raise RuntimeError('Build the GLB first: '+str(SOURCE))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version=0
rig=next((o for o in bpy.data.objects if o.type=='ARMATURE' and o.name=='Rig_Medium'),None)
if rig is None or len(rig.data.bones)!=23:raise RuntimeError('Rig_Medium import failed')
rig['geometry_source']='gardener-v044.glb only'
rig['animation_source']='Rig_Medium_Tools.glb / Digging (unmodified)'
rig['editing_note']='Rebuild with scripts/build_gardener_v044_rig_medium.py after changing weights or tool calibration.'
scene=bpy.context.scene;scene.frame_start=0;scene.frame_end=34;scene.render.fps=24
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT),compress=True)
print('V044_EDITABLE_BLEND_OK',OUTPUT,OUTPUT.stat().st_size)
