"""Geometric contact diagnosis. Does not edit animation or acceptance limits.

Requires Python numpy/scipy. Native observations: dump_digging_contacts.mjs.
The shaft surface distance is triangle-to-finite-axis distance minus radius
(capsule envelope); endpoint cases are explicitly counted, not hidden.
"""
import csv
import gzip
import json
from pathlib import Path

import numpy as np
from scipy.optimize import minimize

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'reviews/digging-contact-diagnostic'
DATA=json.load(gzip.open(OUT/'native-samples.json.gz','rt'))
H=DATA['height']; EPS=.005


def matrix(value):return np.array(value).reshape(4,4,order='F')
def transform(m,points):return np.asarray(points)@m[:3,:3].T+m[:3,3]


def point_segment(p,a,b):
    delta=b-a
    t=np.clip(np.sum((p-a)*delta,axis=-1)/np.sum(delta*delta,axis=-1),0,1)
    q=a+t[...,None]*delta
    return np.linalg.norm(p-q,axis=-1),q,t


def point_triangles(p,tri):
    a,b,c=tri[:,0],tri[:,1],tri[:,2]
    ab,ac=b-a,c-a
    n=np.cross(ab,ac);nn=np.sum(n*n,axis=1)
    projection=p-n*(np.sum((p-a)*n,axis=1)/np.maximum(nn,1e-30))[:,None]
    v=projection-a;d00=np.sum(ab*ab,axis=1);d01=np.sum(ab*ac,axis=1);d11=np.sum(ac*ac,axis=1)
    d20=np.sum(v*ab,axis=1);d21=np.sum(v*ac,axis=1);den=d00*d11-d01*d01
    u=(d11*d20-d01*d21)/np.maximum(den,1e-30);w=(d00*d21-d01*d20)/np.maximum(den,1e-30)
    valid=(den>1e-25)&(u>=0)&(w>=0)&(u+w<=1)
    distance=np.where(valid,np.linalg.norm(projection-p,axis=1),np.inf)
    nearest=projection.copy()
    for x,y in ((a,b),(b,c),(c,a)):
        d,q,_=point_segment(p,x,y);better=d<distance
        distance[better]=d[better];nearest[better]=q[better]
    return distance,nearest


def segment_surface(a,b,tri):
    """Exact finite segment/triangle distance with closest witnesses."""
    d0,p0=point_triangles(a,tri);d1,p1=point_triangles(b,tri)
    k=int(d0.argmin());best=(float(d0[k]),p0[k],a,0.)
    k=int(d1.argmin())
    if d1[k]<best[0]:best=(float(d1[k]),p1[k],b,1.)
    direction=b-a
    for x,y in ((tri[:,0],tri[:,1]),(tri[:,1],tri[:,2]),(tri[:,2],tri[:,0])):
        # Boundary solutions and unconstrained interior/interior solution.
        for p in (x,y):
            d,q,t=point_segment(p,a,b);k=int(d.argmin())
            if d[k]<best[0]:best=(float(d[k]),p[k],q[k],float(t[k]))
        edge=y-x;aa=float(direction@direction);bb=edge@direction;cc=np.sum(edge*edge,axis=1)
        offset=a-x;dd=offset@direction;ee=np.sum(offset*edge,axis=1);den=aa*cc-bb*bb
        t=(bb*ee-cc*dd)/np.maximum(den,1e-30)
        u=(aa*ee-bb*dd)/np.maximum(den,1e-30)
        good=(den>1e-25)&(t>=0)&(t<=1)&(u>=0)&(u<=1)
        p=x+u[:,None]*edge;q=a+t[:,None]*direction
        d=np.where(good,np.linalg.norm(p-q,axis=1),np.inf);k=int(d.argmin())
        if d[k]<best[0]:best=(float(d[k]),p[k],q[k],float(t[k]))
    # Interior segment/triangle intersections (not necessarily on an edge).
    x,y,z=tri[:,0],tri[:,1],tri[:,2];e1=y-x;e2=z-x
    pv=np.cross(np.broadcast_to(direction,e2.shape),e2);det=np.sum(e1*pv,axis=1)
    inv=np.where(np.abs(det)>1e-15,1/np.where(np.abs(det)>1e-15,det,1),0)
    tv=a-x;u=np.sum(tv*pv,axis=1)*inv;qv=np.cross(tv,e1);v=qv@direction*inv
    t=np.sum(e2*qv,axis=1)*inv
    good=(np.abs(det)>1e-15)&(u>=0)&(v>=0)&(u+v<=1)&(t>=0)&(t<=1)
    if np.any(good):
        k=int(np.flatnonzero(good)[0]);q=a+t[k]*direction;best=(0.,q,q,float(t[k]))
    return best


def validate_geometry():
    tri=np.array([[[-1.,0,0],[1,0,0],[0,1,0]]])
    assert abs(segment_surface(np.array([0,.2,-1.]),np.array([0,.2,1.]),tri)[0])<1e-12
    assert abs(segment_surface(np.array([0,.2,2.]),np.array([0,.2,3.]),tri)[0]-2)<1e-12
    assert abs(segment_surface(np.array([2.,0,0]),np.array([3.,0,0]),tri)[0]-1)<1e-12
    # Independent constrained convex solver cross-check, including solutions
    # on triangle/segment boundaries (the failure-prone geometric cases).
    rng=np.random.default_rng(43)
    for _ in range(12):
        tri=rng.normal(size=(1,3,3));a,b=rng.normal(size=(2,3))
        def objective(x):
            p=tri[0,0]+x[1]*(tri[0,1]-tri[0,0])+x[2]*(tri[0,2]-tri[0,0])
            return np.sum((a+x[0]*(b-a)-p)**2)
        result=minimize(objective,[.5,.25,.25],bounds=[(0,1)]*3,
                        constraints=[{'type':'ineq','fun':lambda x:1-x[1]-x[2]}],
                        method='SLSQP',options={'ftol':1e-13,'maxiter':200})
        assert result.success,result.message
        exact=segment_surface(a,b,tri)[0]
        assert abs(exact-np.sqrt(max(0,result.fun)))<2e-6,(exact,result.fun)


def intervals(rows,key,threshold=EPS):
    """Exact discrete exceedances; linear boundary estimates separately labelled."""
    runs=[];start=None
    for i,row in enumerate(rows):
        fail=row[key]>threshold
        if fail and start is None:start=i
        if start is not None and (not fail or i==len(rows)-1):
            stop=i if fail else i-1
            entry={'first_index':start,'last_index':stop,'first_sample_s':rows[start]['time_s'],
                   'last_sample_s':rows[stop]['time_s'],'count':stop-start+1}
            def crossing(a,b):
                fraction=(threshold-rows[a][key])/(rows[b][key]-rows[a][key])
                return rows[a]['time_s']+fraction*(rows[b]['time_s']-rows[a]['time_s'])
            entry['entry_bracket_s']=[rows[max(0,start-1)]['time_s'],rows[start]['time_s']]
            entry['exit_bracket_s']=[rows[stop]['time_s'],rows[min(len(rows)-1,stop+1)]['time_s']]
            entry['linear_entry_estimate_s']=crossing(start-1,start) if start else None
            entry['linear_exit_estimate_s']=crossing(stop,stop+1) if stop<len(rows)-1 else None
            runs.append(entry);start=None
    return runs


def main():
    validate_geometry()
    samples=DATA['samples'];mr=[matrix(r['hands']['r']['slot_matrix']) for r in samples];ml=[matrix(r['hands']['l']['slot_matrix']) for r in samples]
    relative=np.array([(np.linalg.inv(r)@l)[:3,3] for r,l in zip(mr,ml)])
    axis0=relative[0]/np.linalg.norm(relative[0])
    if (mr[0][:3,:3]@axis0)[1]>0:axis0=-axis0
    pca=np.linalg.svd(relative,full_matrices=False)[2][0]
    if (mr[0][:3,:3]@pca)[1]>0:pca=-pca
    # Independent fixed tool configurations. PCA is explicitly a diagnostic
    # whole-cycle fit and cannot certify the source tool (none is supplied).
    setups={
        'baseline_synthetic':dict(axis=axis0.tolist(),a=(-axis0*H*.55*.2).tolist(),b=(axis0*H*.55*.8).tolist(),radius=H*.012,
            provenance='Exact old diagnostic shaft geometry; fixed right-slot frame; radius .012H.'),
        'legacy_zero_pitch':dict(axis=[0,-1,0],a=[0,.37,0],b=[0,-.59,0],radius=.03,
            provenance='gardeningSpade.ts wood shaft: local tool offset -.05, shaft center -.06, length .96; zero pitch. Radius .03 is conservative versus .028-.03 taper.'),
        'fixed_axis_fit':dict(axis=pca.tolist(),a=(-pca*H*.55*.2).tolist(),b=(pca*H*.55*.8).tolist(),radius=.03,
            provenance='Diagnostic best RMS centerline through right slot over all 143 instants; no animation changed; legacy radius .03.'),
    }
    # Configuration sensitivity only: fixed transforms, same dimensions,
    # same source animation and same .005H tolerance. Never an animated fit.
    sweep=[]
    for degrees in (-15,-10,-5,0,5,10,15,175,180,185):
        theta=np.radians(degrees)
        rotation=np.array([[1,0,0],[0,np.cos(theta),-np.sin(theta)],[0,np.sin(theta),np.cos(theta)]])
        a=rotation@np.array([0,.42,0])+[0,-.05,0]
        b=rotation@np.array([0,-.54,0])+[0,-.05,0]
        worst={'r':0.,'l':0.}
        for sample,right in zip(samples,mr):
            wa,wb=transform(right,[a,b])
            for side in ('r','l'):
                surface=np.array(sample['hands'][side]['surface_vertices'])
                tri=surface[np.array(DATA['topology'][side]['triangles'])]
                distance,*_=segment_surface(wa,wb,tri)
                worst[side]=max(worst[side],max(0.,distance-.03)/H)
        sweep.append(dict(pitch_deg=degrees,max_right_surface_gap_H=worst['r'],max_left_surface_gap_H=worst['l']))
        if degrees in (-5,175,180):
            setups[f'legacy_pitch_{degrees}']=dict(axis=((b-a)/np.linalg.norm(b-a)).tolist(),a=a.tolist(),b=b.tolist(),radius=.03,
                pitch_deg=degrees,provenance='Diagnostic fixed X rotation of the existing gardeningSpade.ts about its group origin. Same shaft, no animation change.')
    # Common first-frame tool transform mistake: Blender's pose-bone basis
    # versus native glTF axes. Native matrices are authoritative here.
    results={}
    for name,setup in setups.items():
        a=np.array(setup['a']);b=np.array(setup['b']);axis=(b-a)/np.linalg.norm(b-a);radius=setup['radius']
        references={}
        for side,m in [('r',mr[0]),('l',ml[0])]:
            origin=(np.linalg.inv(mr[0])@m)[:3,3]
            _,q,_=point_segment(origin,a,b)
            references[side]=q
        # Old report used the LEFT SLOT ITSELF, not its projection onto a
        # particular shaft. Preserve this distinct metric verbatim.
        rows=[];witnesses=[]
        for i,sample in enumerate(samples):
            right=mr[i];inverse=np.linalg.inv(right)
            row={'index':i,'time_s':sample['time_s'],'percent':sample['percent'],
                 'historical_fixed_marker_error_H':float(np.linalg.norm(relative[i]-relative[0])/H)}
            witness={'index':i,'time_s':sample['time_s'],'hands':{}}
            world_a,world_b=transform(right,[a,b])
            for side,m in [('r',mr[i]),('l',ml[i])]:
                origin=m[:3,3];local=(inverse@m)[:3,3]
                axis_distance,nearest,t=point_segment(local,a,b)
                origin_gap=max(0.,float(axis_distance)-radius)/H
                ref_world=transform(right,[references[side]])[0]
                surface=np.array(sample['hands'][side]['surface_vertices'])
                tri=surface[np.array(DATA['topology'][side]['triangles'])]
                dist,hand_point,shaft_axis_point,parameter=segment_surface(world_a,world_b,tri)
                surface_gap=max(0.,dist-radius)/H
                deviation=local-references[side];axial=float(deviation@axis)/H
                radial=float(np.linalg.norm(deviation-(deviation@axis)*axis))/H
                prefix='right' if side=='r' else 'left'
                hand_matrix=matrix(sample['hands'][side]['hand_matrix'])
                hand_local=(inverse@hand_matrix)[:3,3]
                hand_initial=(np.linalg.inv(mr[0])@matrix(samples[0]['hands'][side]['hand_matrix']))[:3,3]
                def rotation_only(m):
                    u,_,v=np.linalg.svd(m[:3,:3]);return u@v
                rotation=rotation_only(inverse@hand_matrix)
                initial_rotation=rotation_only(np.linalg.inv(mr[0])@matrix(samples[0]['hands'][side]['hand_matrix']))
                angle=float(np.degrees(np.arccos(np.clip((np.trace(rotation@initial_rotation.T)-1)/2,-1,1))))
                centroid=surface.mean(axis=0)
                centroid_local=transform(inverse,[centroid])[0]
                centroid_initial=transform(np.linalg.inv(mr[0]),[np.array(samples[0]['hands'][side]['surface_vertices']).mean(axis=0)])[0]
                row.update({f'{prefix}_reference_error_H':float(np.linalg.norm(origin-ref_world)/H),
                            f'{prefix}_hand_bone_fixed_reference_error_H':float(np.linalg.norm(hand_local-hand_initial)/H),
                            f'{prefix}_hand_centroid_fixed_reference_error_H':float(np.linalg.norm(centroid_local-centroid_initial)/H),
                            f'{prefix}_hand_centroid_axial_coordinate_H':float((centroid_local-a)@axis)/H,
                            f'{prefix}_hand_relative_rotation_deg':angle,
                            f'{prefix}_slot_axis_distance_H':float(axis_distance)/H,
                            f'{prefix}_slot_shaft_gap_H':origin_gap,
                            f'{prefix}_surface_shaft_gap_H':surface_gap,
                            f'{prefix}_axial_displacement_H':axial,
                            f'{prefix}_radial_distance_H':radial,
                            f'{prefix}_closest_axis_parameter':float(t),
                            f'{prefix}_surface_closest_axis_parameter':float(parameter)})
                # Point on capsule envelope nearest witness. If axis intersects
                # hand, zero gap means intersection, not proof of healthy grip.
                delta=hand_point-shaft_axis_point
                tool_point=shaft_axis_point+(delta/max(np.linalg.norm(delta),1e-20))*radius
                witness['hands'][side]={'slot':origin.tolist(),'reference':ref_world.tolist(),
                    'hand_bone_origin':hand_matrix[:3,3].tolist(),'hand_centroid':centroid.tolist(),
                    'closest_hand_surface':hand_point.tolist(),'closest_shaft_surface':tool_point.tolist()}
            witness.update(shaft_a=world_a.tolist(),shaft_b=world_b.tolist(),shaft_radius=radius)
            rows.append(row);witnesses.append(witness)
        keys=[k for k in rows[0] if k.endswith('_H')]
        summary={key:{'min_H':min(r[key] for r in rows),'max_H':max(r[key] for r in rows),
                      'max_index':max(range(len(rows)),key=lambda i:rows[i][key]),
                      'max_time_s':max(rows,key=lambda r:r[key])['time_s'],
                      'exceedances':intervals(rows,key)} for key in keys}
        with (OUT/f'{name}.csv').open('w') as f:
            writer=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator='\n');writer.writeheader();writer.writerows(rows)
        results[name]={'setup':setup,'references_local':{k:v.tolist() for k,v in references.items()},'summary':summary,'rows':rows,'witnesses':witnesses}
    # A time-varying two-slot frame is an ablation only: it can always put both
    # slot origins on a line, so must NEVER be reported as an original pass.
    dynamic=dict(note='A line through both slots makes radial error identically zero by construction. It is an animated tool orientation, not a fixed right-hand attachment.',
                 required_axis_rotation_deg=[float(np.degrees(np.arccos(np.clip((p/np.linalg.norm(p))@(relative[0]/np.linalg.norm(relative[0])),-1,1)))) for p in relative])
    result={'height':H,'duration_s':DATA['duration_s'],'samples':len(samples),'threshold_H':EPS,
            'source_annotations':DATA['annotations_in_source'],'sources':DATA['sources'],
            'configs':results,'fixed_pitch_sweep':sweep,'dynamic_axis_ablation':dynamic,
            'limits':['No original tool, hand contact events, release events or finger animation supplied in Tools glTF.',
                      'Surface distance is minimum over hand-weight>=.5 triangles to a capsule shaft; zero may indicate intersection, not correct grasp.',
                      'Slot origins are attachment markers, not measured palm-surface contact points.',
                      'Exact times mean exact evaluated discrete samples; between-sample crossing times are bracketed estimates.',
                      'Phase contact intentions must be treated as visual hypotheses, not source-authored annotations.']}
    (OUT/'analysis.json').write_text(json.dumps(result,indent=2)+'\n')
    print('Geometry checks pass. Samples:',len(samples))
    for name,r in results.items():
        print(name,{key:round(r['summary'][key]['max_H']*100,4) for key in ['historical_fixed_marker_error_H','left_reference_error_H','left_slot_shaft_gap_H','left_surface_shaft_gap_H','right_surface_shaft_gap_H']})


if __name__=='__main__':main()
