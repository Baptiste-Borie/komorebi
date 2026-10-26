"""Measure the actual evaluated skin, without editing source assets.

blender -b --factory-startup --python-exit-code 1 --python scripts/blender/verify_digging.py -- --output reviews/digging-baselines --render

Exit 2 means physical acceptance failed; exit 1 is an execution error.
No threshold is inferred from the candidate or fitted to observed errors.
The original Ranger is a hypothesis to test, never an automatic PASS.
"""
import argparse
import csv
import hashlib
import json
import math
import sys
import struct
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'public/assets/kaykit-v045'
TOOLS = BASE / 'animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_Tools.glb'
MODELS = {
    'ranger': BASE / 'character/KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb',
    'v051': BASE / 'gardener-v051.glb',
}
LIMITS = dict(scale=1e-5, edge_strain=.01, grip=.005,
              foot_slide=.005, ground_penetration=.001,
              blade_contact=.005, collision_depth=.005,
              collision_area=.001)
JOINTS = ['hips', 'spine', 'chest', 'upperarm.l', 'upperarm.r',
          'lowerarm.l', 'lowerarm.r', 'wrist.l', 'wrist.r',
          'hand.l', 'hand.r', 'upperleg.l', 'upperleg.r',
          'lowerleg.l', 'lowerleg.r', 'foot.l', 'foot.r', 'toes.l', 'toes.r']


def points(obj, evaluated=True):
    if not evaluated:
        return np.array([tuple(obj.matrix_world @ v.co) for v in obj.data.vertices])
    deps = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(deps)
    mesh = ev.to_mesh()
    result = np.array([tuple(ev.matrix_world @ v.co) for v in mesh.vertices])
    ev.to_mesh_clear()
    return result


def frame(rig, time):
    scene = bpy.context.scene
    f = time * scene.render.fps / scene.render.fps_base
    scene.frame_set(math.floor(f), subframe=f % 1)
    bpy.context.view_layer.update()


def assign(rig, action):
    rig.animation_data_clear()
    rig.animation_data_create()
    rig.animation_data.action = action
    if action.slots:
        rig.animation_data.action_slot = action.slots[0]


def bounds(arr):
    return arr.min(axis=0), arr.max(axis=0)


def load(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = list(set(bpy.data.objects) - before)
    raw = path.read_bytes()
    doc = json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
    active = set()
    def walk(i):
        if i in active: return
        active.add(i)
        for child in doc['nodes'][i].get('children',[]): walk(child)
    for i in doc['scenes'][doc.get('scene',0)]['nodes']: walk(i)
    active_names = {doc['nodes'][i].get('name') for i in active if 'mesh' in doc['nodes'][i]}
    # Blender also imports orphan glTF nodes; Three.js displays only the selected
    # scene. Remove orphan meshes so they cannot affect bounds or collisions.
    for obj in list(objects):
        if obj.type == 'MESH' and obj.name not in active_names:
            objects.remove(obj)
            bpy.data.objects.remove(obj,do_unlink=True)
    rig = next(o for o in objects if o.type == 'ARMATURE')
    # Only the visible model scene, never importer helper shapes.
    meshes = sorted([o for o in objects if o.type == 'MESH' and
                     any(m.type == 'ARMATURE' and m.object == rig for m in o.modifiers)], key=lambda o: o.name)
    rig.animation_data_clear()
    rig.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    rest = {o.name: points(o) for o in meshes}
    lo, hi = bounds(np.concatenate(list(rest.values())))
    height = float(hi[2] - lo[2])
    # One static grounding transform per source, not a per-frame correction.
    rig.location.z -= float(lo[2])
    bpy.context.view_layer.update()
    rest = {o.name: points(o) for o in meshes}
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(TOOLS))
    imported = list(set(bpy.data.objects) - before)
    action = bpy.data.actions.get('Digging')
    if action is None:
        raise RuntimeError('Digging action missing')
    duration = float(action.frame_range[1]) / bpy.context.scene.render.fps
    # Keep only the action. No Tools mannequin mesh survives in the scene.
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    rig.data.pose_position = 'POSE'
    assign(rig, action)
    frame(rig, 0)
    return rig, meshes, rest, height, duration


def grip_matrix(rig, side):
    return rig.matrix_world @ rig.pose.bones['handslot.' + side].matrix


def collision_surface(verts, triangles):
    return BVHTree.FromPolygons([Vector(v) for v in verts], triangles, all_triangles=True)


def collision(a, b, ta, tb, ba, bb, height):
    """Surface intersections + conservative nearest-surface penetration estimate.

    Only intersecting triangle pairs contribute. Intentionally nested surfaces
    are handled by their measured REST baseline, not a name-based allowlist.
    Normals can be unreliable on open clothing: this is a proxy requiring review.
    """
    alo, ahi = bounds(a)
    blo, bhi = bounds(b)
    if np.any(ahi < blo) or np.any(bhi < alo):
        return 0., 0., 0
    pairs = ba.overlap(bb)
    if not pairs:
        return 0., 0., 0
    ia = set(i for x, _ in pairs for i in ta[x])
    ib = set(i for _, y in pairs for i in tb[y])
    depth = 0.
    for verts, ids, tree in ((a, ia, bb), (b, ib, ba)):
        for i in ids:
            nearest = tree.find_nearest(Vector(verts[i]))
            if nearest[0] is not None:
                pos, normal, _, distance = nearest
                if (Vector(verts[i]) - pos).dot(normal) < 0:
                    depth = max(depth, float(distance) / height)
    area = 0.
    for verts, triangles, ids in ((a, ta, set(i for i, _ in pairs)), (b, tb, set(j for _, j in pairs))):
        for i in ids:
            p, q, r = verts[triangles[i]]
            area += float(np.linalg.norm(np.cross(q-p, r-p))) * .5 / height**2
    return depth, area, len(pairs)


def prepare(rig, meshes, rest, height):
    result = {}
    for obj in meshes:
        obj.data.calc_loop_triangles()
        triangles = np.array([tuple(t.vertices) for t in obj.data.loop_triangles], dtype=int)
        edges = np.array([tuple(e.vertices) for e in obj.data.edges], dtype=int)
        p = rest[obj.name]
        outside = np.ones(len(p),dtype=bool)
        # Joint cross sections, not small spheres that miss the limb surface.
        # Axial half-width is fixed at .04H. Radial extents cover limb girth,
        # with larger waist/torso bands. These masks never inspect candidate
        # motion or measured strain.
        for name in JOINTS:
            bone = rig.data.bones[name]
            center = np.array(rig.matrix_world @ bone.head_local)
            axis = np.array((rig.matrix_world.to_3x3() @ (bone.tail_local-bone.head_local)).normalized())
            delta=p-center; axial=delta@axis
            radial=np.linalg.norm(delta-axial[:,None]*axis,axis=1)
            radius=.20 if name in ('hips','spine','chest') else .10 if 'upperarm' in name else .07
            outside &= ~((np.abs(axial)<=.04*height) & (radial<=radius*height))
        lengths = np.linalg.norm(p[edges[:, 0]] - p[edges[:, 1]], axis=1)
        eligible = outside[edges[:, 0]] & outside[edges[:, 1]] & (lengths > 1e-7 * height)
        result[obj.name] = dict(triangles=triangles, edges=edges, lengths=lengths, eligible=eligible)
    return result


def render(rig, meshes, times, duration, tool_points, out, height):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.background_type = 'WORLD'
    if scene.world is None:
        scene.world = bpy.data.worlds.new('DiagnosticWorld')
    scene.world.color = (.65, .67, .61)
    for obj in meshes:
        if obj.data.materials:
            for mat in obj.data.materials:
                if mat and mat.use_nodes:
                    node = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
                    if node:
                        mat.diffuse_color = node.inputs['Base Color'].default_value
    camera_data = bpy.data.cameras.new('ReviewCamera')
    camera = bpy.data.objects.new('ReviewCamera', camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = height * 1.7
    bpy.ops.mesh.primitive_plane_add(size=height*8, location=(0, 0, -.001*height))
    floor = bpy.context.object
    floor.name = 'DiagnosticGround'
    floor.color = (.55,.61,.46,1)
    floor_mat = bpy.data.materials.new('DiagnosticGroundMaterial')
    floor_mat.diffuse_color = floor.color
    floor.data.materials.append(floor_mat)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=height*.012, depth=1)
    shaft = bpy.context.object
    shaft.name = 'DiagnosticShaft'
    shaft_mat = bpy.data.materials.new('DiagnosticWood')
    shaft_mat.diffuse_color = (.5,.3,.12,1)
    shaft.data.materials.append(shaft_mat)
    blade_mesh = bpy.data.meshes.new('DiagnosticBlade')
    blade_mesh.from_pydata([(0,0,0)]*4, [], [(0,1,2,3)])
    blade = bpy.data.objects.new('DiagnosticBlade',blade_mesh)
    scene.collection.objects.link(blade)
    metal = bpy.data.materials.new('DiagnosticSteel')
    metal.diffuse_color = (.27,.35,.37,1)
    blade.data.materials.append(metal)
    for percent in (0,20,45,80,100):
        i = min(range(len(times)), key=lambda k: abs(times[k]-duration*percent/100))
        frame(rig,times[i])
        top, bottom, corners = tool_points[i]
        shaft.location = (top+bottom)*.5
        shaft.rotation_mode = 'QUATERNION'
        shaft.rotation_quaternion = (top-bottom).to_track_quat('Z','Y')
        shaft.scale.z = (top-bottom).length
        for v,p in zip(blade_mesh.vertices,corners): v.co=p
        for name, direction in [('face',(0,-1,.15)),('profil',(1,0,.15)),('trois-quarts',(.75,-1,.25))]:
            target = Vector((0,-.1*height,.46*height))
            camera.location = target+Vector(direction).normalized()*height*4
            camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
            scene.render.filepath = str(out/f'{percent:03d}-{name}.png')
            bpy.ops.render.render(write_still=True)


def measure(label, path, args):
    rig, meshes, rest, height, duration = load(path)
    masks = prepare(rig, meshes, rest, height)
    # Include every native key time, not just a uniform coarse sample.
    times = set(float(x) for x in np.linspace(0,duration,args.samples))
    action = rig.animation_data.action
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    for key in curve.keyframe_points:
                        t = float(key.co[0]) / bpy.context.scene.render.fps
                        if 0 <= t <= duration: times.add(round(t,8))
    times = sorted(times)
    matrices = []
    for time in times:
        frame(rig,time)
        matrices.append((grip_matrix(rig,'r').copy(),grip_matrix(rig,'l').copy()))
    # Calibration is a single rigid tool binding, independent of candidate.
    # First Ranger frame defines the two fixed handle markers; the same local
    # coordinates and tool dimensions are reused for v051. No animated offsets.
    right0, left0 = matrices[0]
    if args.calibration is None:
        left_local = right0.inverted() @ left0.translation
        axis = left_local.normalized()
        args.calibration = dict(left=list(left_local),axis=list(axis),length=height*.55,width=height*.075)
    calibration = args.calibration
    # Independent diagnostic: can a different FIXED marker inside the left
    # hand eliminate the apparent slip? Solve all offsets without anatomical
    # constraints, which gives the source animation more freedom than a real
    # palm. This diagnostic never changes the tested grip markers.
    relative=[np.array((mr.inverted() @ ml)) for mr,ml in matrices]
    fit_a=np.concatenate([np.column_stack([m[:3,:3],-np.eye(3)]) for m in relative])
    fit_b=np.concatenate([-m[:3,3] for m in relative])
    fit_x=np.linalg.lstsq(fit_a,fit_b,rcond=None)[0]
    fit_error=np.linalg.norm((fit_a@fit_x-fit_b).reshape(-1,3),axis=1)/height
    left_marker = Vector(calibration['left'])
    axis = Vector(calibration['axis'])
    # A conventional long shaft: first grip is 20% down from its upper end.
    # Axis sign is chosen so the blade points downward at the initial pose.
    direction = right0.to_3x3() @ axis
    blade_axis = axis if direction.z < 0 else -axis
    length = calibration['length']
    shaft_top = -blade_axis * length*.2
    shaft_bottom = blade_axis * length*.8
    blade_tip = blade_axis * length*1.1
    lateral = blade_axis.cross(Vector((1,0,0)))
    if lateral.length < .01: lateral = blade_axis.cross(Vector((0,0,1)))
    lateral.normalize()
    corners = [shaft_bottom-lateral*calibration['width'],shaft_bottom+lateral*calibration['width'],
               blade_tip+lateral*calibration['width']*.05,blade_tip-lateral*calibration['width']*.05]
    baseline_trees = {n:collision_surface(p,masks[n]['triangles']) for n,p in rest.items()}
    pairs = [(a.name,b.name) for i,a in enumerate(meshes) for b in meshes[i+1:]]
    baseline_collisions = {}
    for a,b in pairs:
        baseline_collisions[a,b] = collision(rest[a],rest[b],masks[a]['triangles'],masks[b]['triangles'],baseline_trees[a],baseline_trees[b],height)
    feet = {}
    for side,sign in [('l',1),('r',-1)]:
        candidates = [(o.name,p) for o in meshes for p in [rest[o.name]] if ('LegLeft' if side=='l' else 'LegRight') in o.name]
        if not candidates: raise RuntimeError('No semantic foot meshes for '+label+' '+side)
        for name,p in candidates:
            ids=np.flatnonzero(p[:,2] <= p[:,2].min()+.01*height)
            feet[side]=(name,ids)
    rows=[]; diagnostics=[]; tools=[]; first_feet={}; first_pose={}
    for index,time in enumerate(times):
        frame(rig,time)
        current={o.name:points(o) for o in meshes}
        if not first_pose: first_pose=current
        scales=[]
        for bone in rig.pose.bones:
            local=max(abs(float(x)-1) for x in bone.scale)
            deform=bone.matrix @ bone.bone.matrix_local.inverted()
            singular=np.linalg.svd(np.array(deform.to_3x3()),compute_uv=False)
            scales.append(max(local,float(np.max(np.abs(singular-1)))))
        strain=0.; worst_edge=None
        for name,p in current.items():
            data=masks[name]; mask=data['eligible']; e=data['edges'][mask]
            if len(e):
                ratio=np.abs(np.linalg.norm(p[e[:,0]]-p[e[:,1]],axis=1)/data['lengths'][mask]-1)
                k=int(ratio.argmax())
                if ratio[k]>strain: strain=float(ratio[k]); worst_edge=[name,*map(int,e[k])]
        mr,ml=matrices[index]
        grip=(mr@left_marker-ml.translation).length/height
        top,bottom=mr@shaft_top,mr@shaft_bottom
        world_corners=[mr@p for p in corners]
        tools.append((top,bottom,world_corners))
        blade_height=min(p.z for p in world_corners)/height
        foot_values={}
        for side,(name,ids) in feet.items():
            sole=current[name][ids]
            if side not in first_feet: first_feet[side]=sole.copy()
            slide=float(np.max(np.linalg.norm(sole[:,:2]-first_feet[side][:,:2],axis=1)))/height
            minz=float(sole[:,2].min())/height
            foot_values[side]=(slide,minz)
        trees={n:collision_surface(p,masks[n]['triangles']) for n,p in current.items()}
        bad_collisions=[]
        for a,b in pairs:
            depth,area,count=collision(current[a],current[b],masks[a]['triangles'],masks[b]['triangles'],trees[a],trees[b],height)
            old_depth,old_area,_=baseline_collisions[a,b]
            if depth>max(LIMITS['collision_depth'],old_depth+LIMITS['collision_depth']) and area>max(LIMITS['collision_area'],old_area+LIMITS['collision_area']):
                bad_collisions.append(dict(a=a,b=b,depth_H=depth,area_H2=area,rest_depth_H=old_depth,rest_area_H2=old_area,triangle_pairs=count))
        row=dict(time_s=time,percent=time/duration*100,scale=max(scales),edge_strain=strain,
                 grip_right_H=0.,grip_left_H=grip,
                 foot_left_slide_H=foot_values['l'][0],foot_right_slide_H=foot_values['r'][0],
                 foot_left_min_z_H=foot_values['l'][1],foot_right_min_z_H=foot_values['r'][1],
                 blade_min_z_H=blade_height,major_collision_pairs=len(bad_collisions))
        rows.append(row)
        diagnostics.append(dict(time_s=time,worst_edge=worst_edge,collisions=bad_collisions))
        if index%25==0: print('MEASURE',label,index,len(times),flush=True)
    # Report full-cycle sole movement explicitly; stance is NOT chosen from the
    # measured velocity (that would silently exclude sliding feet).
    maxima={k:max(r[k] for r in rows) for k in rows[0] if k not in ('time_s','percent')}
    penetration=max(0.,-min(min(r['foot_left_min_z_H'],r['foot_right_min_z_H']) for r in rows))
    # Approximate strike = deepest blade pose, clearly marked unannotated. A
    # passing final test requires an independently annotated strike time.
    strike=min(rows,key=lambda r:r['blade_min_z_H'])
    checks=dict(scale=maxima['scale']<=LIMITS['scale'],edge_strain=maxima['edge_strain']<=LIMITS['edge_strain'],
                grip_left=maxima['grip_left_H']<=LIMITS['grip'],grip_right=True,
                feet_slide=max(maxima['foot_left_slide_H'],maxima['foot_right_slide_H'])<=LIMITS['foot_slide'],
                feet_ground=penetration<=LIMITS['ground_penetration'],
                blade_contact=abs(strike['blade_min_z_H'])<=LIMITS['blade_contact'],
                collisions=maxima['major_collision_pairs']==0)
    out=args.output/label;out.mkdir(parents=True,exist_ok=True)
    with (out/'frames.csv').open('w') as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator='\n');writer.writeheader();writer.writerows(rows)
    report=dict(model=label,source=str(path.relative_to(ROOT)),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                clip_sha256=hashlib.sha256(TOOLS.read_bytes()).hexdigest(),height=height,duration_s=duration,samples=len(times),
                fixed_marker_least_squares=dict(left_local=fit_x[:3].tolist(),tool_local=fit_x[3:].tolist(),
                    max_residual_H=float(fit_error.max()),rms_residual_H=float(np.sqrt(np.mean(fit_error**2))),
                    note='Unconstrained least-squares diagnostic; not a minimax optimum or a corrected animation.'),
                limits=LIMITS,calibration=calibration,joint_exclusion_radius_H=.04,
                joint_mask='Cylindrical joint cross sections: axial half-width .04H; radial extent .20H torso, .10H shoulders, .07H other joints.',
                edge_masks={n:dict(total=len(x['edges']),tested=int(x['eligible'].sum())) for n,x in masks.items()},
                checks=checks,pass_all=all(checks.values()),maxima=maxima,ground_penetration_H=penetration,
                tentative_strike=strike,diagnostics=diagnostics,
                limitations=['Strike is deepest blade pose, not independently annotated: blade_contact is provisional and cannot certify final acceptance.',
                            'Foot slide is measured for the full cycle; lift/stance intervals require visual annotation.',
                            'Collision depth is an intersection/nearest-surface proxy, not exact solid penetration.',
                            'Diagnostic tool calibrated once to Ranger first-frame handslots; not the legacy Three.js spade.',
                            'Grip right is exact by construction; grip left tests a fixed material handle point.',
                            'Ranger textured albedo may not be reproduced by Workbench diagnostic renders.'])
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    if args.render: render(rig,meshes,times,duration,tools,out,height)
    print('RESULT',label,json.dumps(dict(checks=checks,maxima=maxima,penetration=penetration)),flush=True)
    return report


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'reviews/digging-baselines')
    parser.add_argument('--samples',type=int,default=101)
    parser.add_argument('--render',action='store_true')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if args.samples<101:parser.error('At least 101 samples required')
    args.output=args.output.resolve();args.output.mkdir(parents=True,exist_ok=True)
    args.calibration=None
    reports=[measure(label,path,args) for label,path in MODELS.items()]
    summary=dict(status='baseline_validated' if reports[0]['pass_all'] and not reports[1]['pass_all'] else 'baseline_rejected',
                 models=[dict(model=r['model'],pass_all=r['pass_all'],checks=r['checks']) for r in reports],
                 solution_iterations=0)
    (args.output/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    print('SUMMARY',json.dumps(summary),flush=True)
    if summary['status']!='baseline_validated':sys.exit(2)


if __name__=='__main__':main()
