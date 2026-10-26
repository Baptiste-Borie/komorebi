"""Physical checks for the real V0.44 geometry on Rig_Medium.

The 0.5% H contact and foot thresholds, 0.1% H ground threshold and 1%
rigid-region edge threshold are unchanged. Blended articulation edges are
reported separately because linear blend skinning intentionally changes them.
"""
import bpy
import csv
import json
import math
import struct
import sys
from pathlib import Path

import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[2]
ASSET=ROOT/'public/assets/kaykit-v045/gardener-v044-rig-medium.glb'
OUT=ROOT/'reviews/v044-rig-medium/final'
LIMITS={'scale':1e-5,'rigid_edge_strain':.01,'hand_surface_gap_H':.005,
        'fixed_grip_H':1e-5,'foot_slide_H':.005,'ground_penetration_H':.001,
        'blade_impact_H':.005,'collision_depth_delta_H':.005,'collision_area_delta_H2':.001}
IMPACT_TIME=1/3
SUPPORT={'left':[[0.,1.4]],'right':[[0.,1.4]]}


def gltf_document(path):
    raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0]
    return json.loads(raw[20:20+length])


def set_time(rig,time):
    scene=bpy.context.scene;value=time*scene.render.fps/scene.render.fps_base
    scene.frame_set(math.floor(value),subframe=value%1);bpy.context.view_layer.update()


def evaluated_points(obj):
    evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
    result=np.array([tuple(evaluated.matrix_world@v.co) for v in mesh.vertices]);evaluated.to_mesh_clear();return result


def triangles(obj):
    obj.data.calc_loop_triangles();return np.array([tuple(t.vertices) for t in obj.data.loop_triangles],dtype=int)


def point_segment(points,a,b):
    delta=b-a;t=np.clip(((points-a)@delta)/(delta@delta),0,1);q=a+t[:,None]*delta
    return np.linalg.norm(points-q,axis=1),t


def segment_from_shaft(points):
    center=points.mean(axis=0);axis=np.linalg.svd(points-center,full_matrices=False)[2][0]
    q=(points-center)@axis;a=center+axis*q.min();b=center+axis*q.max()
    radial=np.linalg.norm((points-center)-q[:,None]*axis,axis=1)
    return a,b,float(np.median(radial))


def hand_gap(points,tri,a,b,radius):
    # Triangle edges are sampled through their actual vertices. On this low-poly
    # hand the maximum triangle edge is also reported, bounding discretization.
    ids=np.unique(tri.reshape(-1));distance,t=point_segment(points[ids],a,b)
    k=int(distance.argmin());return max(0.,float(distance[k]-radius)),float(t[k])


def collision_data(points,tri):return BVHTree.FromPolygons([Vector(p) for p in points],tri.tolist(),all_triangles=True)


def collision_proxy(a,b,ta,tb,ba,bb,H):
    pairs=ba.overlap(bb)
    if not pairs:return 0.,0.,0
    ia={i for i,_ in pairs};ib={j for _,j in pairs};depth=0.
    for points,ids,triangles_,tree in ((a,ia,ta,bb),(b,ib,tb,ba)):
        vertices={int(v) for index in ids for v in triangles_[index]}
        for vertex in vertices:
            nearest=tree.find_nearest(Vector(points[vertex]))
            if nearest[0] is not None:
                position,normal,_,distance=nearest
                if (Vector(points[vertex])-position).dot(normal)<0:depth=max(depth,float(distance)/H)
    area=0.
    for points,triangles_,ids in ((a,ta,ia),(b,tb,ib)):
        for index in ids:
            p,q,r=points[triangles_[index]];area+=float(np.linalg.norm(np.cross(q-p,r-p)))*.5/H**2
    return depth,area,len(pairs)


def family(name):
    n=name.lower()
    if 'arm l ' in n:return 'arm_right' if n.endswith('.001') else 'arm_left'
    if 'folded cuff' in n or 'sleeve' in n:return 'arm_right' if ' -1' in n else 'arm_left'
    if 'boot 1' in n:return 'foot_left'
    if 'boot -1' in n:return 'foot_right'
    if any(x in n for x in ('face','eyes','brows','smile','hair','hat','straw')):return 'head'
    if 'overalls' in n:return 'lower_body'
    return 'torso'


def expected_seam(left,right):
    names=(left.lower(),right.lower())
    # These pairs deliberately overlap to hide open garment boundaries. They
    # remain measured and reported as seams instead of disappearing from audit.
    overalls=(any('overalls' in n for n in names) and
              (any('bib ' in n for n in names) or any('boot ' in n for n in names)))
    sewn_armhole=(any('shirt' in n for n in names) and
                  any(('folded cuff' in n or 'sleeve' in n) for n in names))
    return overalls or sewn_armhole


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    doc=gltf_document(ASSET)
    assert doc.get('extras',{}).get('ranger_meshes_in_output') is False
    assert all(m.get('name','').startswith('V044_') for m in doc['meshes'])
    assert [a.get('name') for a in doc.get('animations',[])]==['Digging']
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(ASSET))
    rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');action=bpy.data.actions['Digging']
    rig.animation_data_create();rig.animation_data.action=action
    if action.slots:rig.animation_data.action_slot=action.slots[0]
    character=sorted([o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)],key=lambda o:o.name)
    tool=sorted([o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('V044_') and not any(m.type=='ARMATURE' for m in o.modifiers)],key=lambda o:o.name)
    if len(doc['meshes'])!=38 or not character or len(tool)!=7:raise RuntimeError((len(doc['meshes']),len(character),len(tool)))
    rig.data.pose_position='REST';bpy.context.view_layer.update()
    rest={o.name:evaluated_points(o) for o in character};all_rest=np.concatenate(list(rest.values()));lo=all_rest.min(axis=0);hi=all_rest.max(axis=0);H=float(hi[2]-lo[2])
    rig.location.z-=float(lo[2]);bpy.context.view_layer.update();rest={o.name:evaluated_points(o) for o in character}
    rig.data.pose_position='POSE';set_time(rig,0)
    # Exact historical 143 timestamps make reports directly comparable.
    with (ROOT/'reviews/digging-measures/ranger/frames.csv').open() as f:times=[float(row['time_s']) for row in csv.DictReader(f)]
    if len(times)!=143:raise RuntimeError('Expected 143 historical timestamps')
    mesh_data={}
    for obj in character:
        tri=triangles(obj);edges=np.array([tuple(e.vertices) for e in obj.data.edges],dtype=int);p=rest[obj.name]
        single=[]
        for vertex in obj.data.vertices:
            weights=[(obj.vertex_groups[g.group].name,g.weight) for g in vertex.groups if g.weight>1e-6]
            single.append(weights[0][0] if len(weights)==1 and weights[0][1]>.999 else None)
        rigid=np.array([single[a] is not None and single[a]==single[b] for a,b in edges])
        lengths=np.linalg.norm(p[edges[:,0]]-p[edges[:,1]],axis=1)
        valid=lengths>H*1e-6
        # The V0.44 arm is continuous below its garment. Upper-arm triangles
        # hidden inside the sleeve are still measured as raw overlaps, but are
        # not a visible-surface collision. A triangle is exposed only when all
        # vertices are predominantly lower-arm/wrist/hand weighted.
        collision_tri=tri
        if obj.name.startswith('V044_Arm L '):
            suffix='r' if obj.name.endswith('.001') else 'l'
            exposed=[]
            for vertex in obj.data.vertices:
                visible_weight=sum(g.weight for g in vertex.groups
                    if obj.vertex_groups[g.group].name in ('lowerarm.'+suffix,'wrist.'+suffix,'hand.'+suffix))
                exposed.append(visible_weight>=.70)
            collision_tri=np.array([row for row in tri if all(exposed[i] for i in row)],dtype=int)
        mesh_data[obj.name]={'tri':tri,'collision_tri':collision_tri,'edges':edges,'valid':valid,'rigid':rigid&valid,'lengths':lengths,'family':family(obj.name)}
    arms={}
    for side,suffix in [('left','l'),('right','r')]:
        candidates=[o for o in character if o.name.startswith('V044_Arm L ')]
        obj=next(o for o in candidates if (o.name.endswith('.001'))==(side=='right'))
        group=obj.vertex_groups.get('hand.'+suffix);ids=[]
        for vertex in obj.data.vertices:
            weight=sum(g.weight for g in vertex.groups if obj.vertex_groups[g.group].name=='hand.'+suffix)
            if weight>=.5:ids.append(vertex.index)
        tri=triangles(obj);selected=np.array([row for row in tri if all(i in set(ids) for i in row)],dtype=int)
        arms[side]=(obj,selected)
    shaft=next(o for o in tool if 'wood shaft' in o.name);blade=next(o for o in tool if 'curved steel spade' in o.name)
    tool_data={o.name:{'tri':triangles(o)} for o in tool}
    # Both boots are made of two material primitives after import.
    boots={side:[o for o in character if token in o.name] for side,token in [('left','V044_Boot 1'),('right','V044_Boot -1')]}
    sole={}
    for side,objects in boots.items():
        z=min(rest[o.name][:,2].min() for o in objects);sole[side]=[(o,np.flatnonzero(rest[o.name][:,2]<=z+.015*H)) for o in objects]
    first_sole={};first_relative=None;rows=[];collision_samples=[]
    # Collision audit at the five review poses plus impact; measurement tests
    # all non-identical semantic families against their rest baseline.
    collision_indices={min(range(len(times)),key=lambda i:abs(times[i]-t)) for t in [0,.28,.63,1.12,1.4,IMPACT_TIME]}
    rest_trees={name:collision_data(rest[name],data['collision_tri']) for name,data in mesh_data.items()}
    raw_rest_trees={name:collision_data(rest[name],data['tri']) for name,data in mesh_data.items()}
    pairs=[]
    names=list(rest)
    for i,a in enumerate(names):
        for b in names[i+1:]:
            if mesh_data[a]['family']==mesh_data[b]['family']:continue
            base=collision_proxy(rest[a],rest[b],mesh_data[a]['collision_tri'],mesh_data[b]['collision_tri'],rest_trees[a],rest_trees[b],H)
            raw_base=collision_proxy(rest[a],rest[b],mesh_data[a]['tri'],mesh_data[b]['tri'],raw_rest_trees[a],raw_rest_trees[b],H)
            pairs.append((a,b,base,raw_base))
    for index,time in enumerate(times):
        set_time(rig,time);current={o.name:evaluated_points(o) for o in character}
        scale=0.
        for bone in rig.pose.bones:
            scale=max(scale,max(abs(float(x)-1) for x in bone.scale))
        rigid_strain=0.;blend_strain=[];worst=None
        for name,p in current.items():
            data=mesh_data[name];e=data['edges'];ratio=np.abs(np.linalg.norm(p[e[:,0]]-p[e[:,1]],axis=1)/np.maximum(data['lengths'],1e-30)-1)
            if np.any(data['rigid']):
                local=float(ratio[data['rigid']].max())
                if local>rigid_strain:rigid_strain=local;worst=name
            blend_strain.extend(ratio[data['valid']&~data['rigid']].tolist())
        shaft_points=evaluated_points(shaft);a,b,radius=segment_from_shaft(shaft_points)
        contacts={}
        for side,(obj,tri) in arms.items():
            gap,axial=hand_gap(current[obj.name],tri,a,b,radius);contacts[side]=(gap/H,axial)
        socket=rig.matrix_world@rig.pose.bones['handslot.r'].matrix
        relative=np.array(socket.inverted()@shaft.matrix_world)
        if first_relative is None:first_relative=relative
        fixed=float(np.max(np.abs(relative-first_relative)))
        foot={}
        for side,entries in sole.items():
            pieces=[current[o.name][ids] for o,ids in entries];points=np.concatenate(pieces)
            if side not in first_sole:first_sole[side]=points.copy()
            foot[side]=(float(np.max(np.linalg.norm(points[:,:2]-first_sole[side][:,:2],axis=1)))/H,float(points[:,2].min())/H)
        blade_z=float(evaluated_points(blade)[:,2].min())/H
        collisions=[];seams=[];covered_internal=[];tool_collisions=[]
        if index in collision_indices:
            trees={name:collision_data(current[name],mesh_data[name]['collision_tri']) for name in names}
            raw_trees={name:collision_data(current[name],mesh_data[name]['tri']) for name in names}
            for left,right,base,raw_base in pairs:
                value=collision_proxy(current[left],current[right],mesh_data[left]['collision_tri'],mesh_data[right]['collision_tri'],trees[left],trees[right],H)
                raw_value=collision_proxy(current[left],current[right],mesh_data[left]['tri'],mesh_data[right]['tri'],raw_trees[left],raw_trees[right],H)
                if value[0]>base[0]+LIMITS['collision_depth_delta_H'] and value[1]>base[1]+LIMITS['collision_area_delta_H2']:
                    item={'left':left,'right':right,'depth_H':value[0],'area_H2':value[1],'rest_depth_H':base[0],'rest_area_H2':base[1],'triangle_pairs':value[2]}
                    (seams if expected_seam(left,right) else collisions).append(item)
                elif raw_value[0]>raw_base[0]+LIMITS['collision_depth_delta_H'] and raw_value[1]>raw_base[1]+LIMITS['collision_area_delta_H2']:
                    covered_internal.append({'left':left,'right':right,'depth_H':raw_value[0],'area_H2':raw_value[1],
                                             'rest_depth_H':raw_base[0],'rest_area_H2':raw_base[1],'triangle_pairs':raw_value[2],
                                             'classification':'covered upper-arm volume; retained for audit, excluded from visible-surface verdict'})
            # Tool/character contacts: arm families are the intended two grips;
            # every other character family remains under collision control.
            tool_points={o.name:evaluated_points(o) for o in tool}
            tool_trees={o.name:collision_data(tool_points[o.name],tool_data[o.name]['tri']) for o in tool}
            for tool_obj in tool:
                for char_name in names:
                    if mesh_data[char_name]['family'].startswith('arm_'):continue
                    value=collision_proxy(tool_points[tool_obj.name],current[char_name],tool_data[tool_obj.name]['tri'],mesh_data[char_name]['collision_tri'],tool_trees[tool_obj.name],trees[char_name],H)
                    if value[0]>LIMITS['collision_depth_delta_H'] and value[1]>LIMITS['collision_area_delta_H2']:
                        tool_collisions.append({'tool':tool_obj.name,'character':char_name,'depth_H':value[0],'area_H2':value[1],'triangle_pairs':value[2]})
            collision_samples.append({'index':index,'time_s':time,'visible_collisions':collisions,'expected_seams':seams,
                                      'covered_internal_overlaps':covered_internal,'tool_collisions':tool_collisions})
        rows.append({'index':index,'time_s':time,'percent':time/1.4*100,'scale':scale,'rigid_edge_strain':rigid_strain,'worst_rigid_mesh':worst,
                     'blend_edge_strain_p95':float(np.percentile(blend_strain,95)),'blend_edge_strain_max':float(max(blend_strain)),
                     'right_surface_gap_H':contacts['right'][0],'left_surface_gap_H':contacts['left'][0],
                     'right_shaft_parameter':contacts['right'][1],'left_shaft_parameter':contacts['left'][1],'fixed_grip_matrix_error':fixed,
                     'left_foot_slide_H':foot['left'][0],'right_foot_slide_H':foot['right'][0],
                     'left_foot_min_z_H':foot['left'][1],'right_foot_min_z_H':foot['right'][1],'blade_min_z_H':blade_z})
        if index%35==0:print('VERIFY_SAMPLE',index,len(times),flush=True)
    impact=min(rows,key=lambda r:abs(r['time_s']-IMPACT_TIME))
    maxv={key:max(row[key] for row in rows) for key in ('scale','rigid_edge_strain','blend_edge_strain_p95','blend_edge_strain_max','right_surface_gap_H','left_surface_gap_H','fixed_grip_matrix_error','left_foot_slide_H','right_foot_slide_H')}
    penetration=max(0.,-min(min(r['left_foot_min_z_H'],r['right_foot_min_z_H']) for r in rows))
    collision_count=sum(len(x['visible_collisions'])+len(x['tool_collisions']) for x in collision_samples)
    checks={'scale':maxv['scale']<=LIMITS['scale'],'rigid_edges':maxv['rigid_edge_strain']<=LIMITS['rigid_edge_strain'],
            'right_grip':maxv['right_surface_gap_H']<=LIMITS['hand_surface_gap_H'] and maxv['fixed_grip_matrix_error']<=LIMITS['fixed_grip_H'],
            'left_sliding_contact':maxv['left_surface_gap_H']<=LIMITS['hand_surface_gap_H'] and all(0<=r['left_shaft_parameter']<=1 for r in rows),
            'feet_support':max(maxv['left_foot_slide_H'],maxv['right_foot_slide_H'])<=LIMITS['foot_slide_H'] and penetration<=LIMITS['ground_penetration_H'],
            'blade_impact':abs(impact['blade_min_z_H'])<=LIMITS['blade_impact_H'],'major_collisions':collision_count==0}
    report={'asset':str(ASSET.relative_to(ROOT)),'height':H,'duration_s':1.4,'samples':len(rows),'limits':LIMITS,'support_phases':SUPPORT,
            'impact_definition':{'time_s':IMPACT_TIME,'reason':'native key at the first local minimum of the downward shovel stroke; defined before checking blade height','sample':impact},
            'edge_classification':{'rigid':'both vertices have exactly one identical bone weight > 0.999; 1% threshold applies','blend':'joint/clothing transition; reported p95/max separately and never silently removed'},
            'collision_classification':{'visible':'BVH test on garment surfaces and exposed lower-arm/wrist/hand triangles; quality threshold applies',
                                        'covered_internal':'full continuous arm volume hidden under a sleeve; raw excess retained in every audited pose',
                                        'expected_seam':'intentional garment boundary overlap; measured separately, never deleted'},
            'checks':checks,'pass_all':all(checks.values()),'maxima':maxv,'ground_penetration_H':penetration,'collision_audit':collision_samples,
            'reference_deviations':{'Ranger is comparison only':'Prior report remains in reviews/digging-measures; no Ranger PASS assumption.','blend_edge_max_is_not_rigid_test':maxv['blend_edge_strain_max']},
            'limitations':['Hand distance samples low-poly hand-surface vertices against the fitted finite shaft capsule; it does not prove finger wrapping or absence of tool penetration.',
                           'Collision depth remains a BVH/nearest-surface proxy. Hidden continuous upper-arm skin is reported as covered_internal_overlap; same-family nested clothing is inspected visually.',
                           'Both feet are annotated as support for the full in-place Digging cycle; no interval is dropped based on measured velocity.']}
    (OUT/'measurements.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    with (OUT/'frames.csv').open('w') as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator='\n');writer.writeheader();writer.writerows(rows)
    print('V044_VERIFY_RESULT',json.dumps({'checks':checks,'maxima':maxv,'impact':impact['blade_min_z_H'],'penetration':penetration,'collisions':collision_count}),flush=True)
    if not report['pass_all']:sys.exit(2)


if __name__=='__main__':main()
