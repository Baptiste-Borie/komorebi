#!/usr/bin/env python3
"""Build the real V0.44 gardener on the unmodified KayKit Rig_Medium.

Geometry/material sources: public/assets/gardener-v044.glb only.
Skeleton/action source: official Rig_Medium files. No Ranger or V0.51 mesh is
copied. The lowered V0.44 arm pieces are rigidly reposed to the KayKit T-pose;
weights blend only around anatomical joints. The embedded Digging action is a
byte-decoded/re-encoded copy of the official action, never edited in place.
"""
from __future__ import annotations

import copy
import json
import math
import struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OLD=ROOT/'public/assets/gardener-v044.glb'
BASE=ROOT/'public/assets/kaykit-v045/character/KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb'
TOOLS=ROOT/'public/assets/kaykit-v045/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_Tools.glb'
OUTPUT=ROOT/'public/assets/kaykit-v045/gardener-v044-rig-medium.glb'
REPORT=ROOT/'public/assets/kaykit-v045/gardener-v044-rig-medium.build.json'

COMP={5121:('B',1),5123:('H',2),5125:('I',4),5126:('f',4)}
DIM={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}


class GLB:
    def __init__(self,path):
        self.path=Path(path);data=self.path.read_bytes()
        if data[:4]!=b'glTF' or struct.unpack_from('<I',data,4)[0]!=2:raise ValueError(path)
        pos=12;chunks={}
        while pos<len(data):
            length,tag=struct.unpack_from('<I4s',data,pos);pos+=8
            chunks[tag]=data[pos:pos+length];pos+=length
        self.d=json.loads(chunks[b'JSON']);self.bin=bytearray(chunks[b'BIN\0'])
    def read(self,index):
        a=self.d['accessors'][index];v=self.d['bufferViews'][a['bufferView']]
        fmt,width=COMP[a['componentType']];size=DIM[a['type']]
        stride=v.get('byteStride',width*size);start=v.get('byteOffset',0)+a.get('byteOffset',0)
        return [struct.unpack_from('<'+fmt*size,self.bin,start+i*stride) for i in range(a['count'])]
    def append(self,values,kind,component,target=None,limits=False):
        values=list(values);fmt,width=COMP[component];size=DIM[kind]
        body=b''.join(struct.pack('<'+fmt*size,*row) for row in values)
        while len(self.bin)%4:self.bin.append(0)
        start=len(self.bin);self.bin.extend(body)
        view={'buffer':0,'byteOffset':start,'byteLength':len(body)}
        if target is not None:view['target']=target
        view_id=len(self.d['bufferViews']);self.d['bufferViews'].append(view)
        a={'bufferView':view_id,'componentType':component,'count':len(values),'type':kind}
        if limits:
            a['min']=[min(row[k] for row in values) for k in range(size)]
            a['max']=[max(row[k] for row in values) for k in range(size)]
        index=len(self.d['accessors']);self.d['accessors'].append(a);return index
    def save(self,path):
        self.d['buffers'][0]['byteLength']=len(self.bin)
        raw=json.dumps(self.d,separators=(',',':'),ensure_ascii=False).encode()
        raw+=b' '*(-len(raw)%4);binary=bytes(self.bin)+b'\0'*(-len(self.bin)%4)
        body=struct.pack('<I4s',len(raw),b'JSON')+raw+struct.pack('<I4s',len(binary),b'BIN\0')+binary
        Path(path).write_bytes(b'glTF'+struct.pack('<II',2,12+len(body))+body)


def smooth(value):
    value=max(0.,min(1.,value));return value*value*(3-2*value)
def normalize(v):
    length=math.sqrt(sum(x*x for x in v));return tuple(x/length for x in v)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))

# Static geometric calibration from both V0.44 hand surfaces over the Digging
# cycle. A minimax line fit keeps the finite-radius shaft in continuous contact;
# this is one fixed mount, never an animated per-frame fit. Source +Y maps
# opposite the axis so the original V0.44 blade remains at the digging end.
TOOL_AXIS=normalize((.19254547,.98054768,-.03811167))
# Translation along the fitted line does not change either grip distance; this
# 3.14 cm axial offset calibrates the blade tip to the predeclared impact key.
TOOL_CENTER=(-.13349809,-.15583830,-.08468653)
_ex=normalize((1-TOOL_AXIS[0]**2,-TOOL_AXIS[0]*TOOL_AXIS[1],-TOOL_AXIS[0]*TOOL_AXIS[2]))
_ez=normalize(tuple(-x for x in cross(_ex,TOOL_AXIS)))
def transform_tool(position,normal):
    x,y,z=position;nx,ny,nz=normal;q=.784-y;depth=z-.57
    p=tuple(TOOL_CENTER[k]+TOOL_AXIS[k]*q+_ex[k]*x+_ez[k]*depth for k in range(3))
    n=normalize(tuple(-TOOL_AXIS[k]*ny+_ex[k]*nx+_ez[k]*nz for k in range(3)))
    return p,n


def transform_arm(position,normal,side):
    """V0.44 lowered arm -> Rig_Medium lateral bind pose.

    This is an affine segment reorientation: cross-sections remain recognizable;
    no Ranger dimensions or vertices are sampled.
    """
    x,y,z=position;nx,ny,nz=normal
    across=side*(x-side*.4)
    out_x=side*(.249+1.245*(1.053-y))
    progress=(abs(out_x)-.249)/.69
    # The V0.44 torso is rounder than Ranger. Ease forearms/hands 5 cm toward
    # the camera while leaving the sewn shoulder root unchanged, avoiding the
    # visible forearm-through-bib intersection in the original plane.
    forward=-.12*smooth((progress-.30)/.55)
    transformed=(out_x,1.108+across*.84,z*.96+forward)
    transformed_normal=normalize((-side*ny/1.245,side*nx/.84,nz/.96))
    return transformed,transformed_normal


def arm_weights(position,side,joint):
    progress=(abs(position[0])-.249)/.69
    ids=[joint[f'upperarm.{side}'],joint[f'lowerarm.{side}'],joint[f'wrist.{side}'],joint[f'hand.{side}']]
    values=[0.,0.,0.,0.]
    if progress<.38:values[0]=1
    elif progress<.56:
        t=smooth((progress-.38)/.18);values[0],values[1]=1-t,t
    elif progress<.76:values[1]=1
    elif progress<.85:
        t=smooth((progress-.76)/.09);values[1],values[2]=1-t,t
    elif progress<.92:
        t=smooth((progress-.85)/.07);values[2],values[3]=1-t,t
    else:values[3]=1
    return tuple(ids),tuple(values)


def torso_weights(position,joint):
    x,y,_=position
    to_spine=smooth((y-.48)/.23);to_chest=smooth((y-.72)/.35)
    hips=1-to_spine;spine=to_spine*(1-to_chest);chest=to_spine*to_chest
    shoulder=smooth((abs(x)-.22)/.14)*smooth((y-.91)/.18)*.42
    hips*=1-shoulder;spine*=1-shoulder;chest*=1-shoulder
    side='l' if x>=0 else 'r'
    return ((joint['hips'],joint['spine'],joint['chest'],joint[f'upperarm.{side}']),
            (hips,spine,chest,shoulder))


def leg_weights(position,joint):
    x,y,_=position;side='l' if x>=0 else 'r'
    upper=joint[f'upperleg.{side}'];lower=joint[f'lowerleg.{side}'];hips=joint['hips'];spine=joint['spine']
    if y<.27:return (lower,0,0,0),(1.,0,0,0)
    if y<.34:
        t=smooth((y-.27)/.07);return (lower,upper,0,0),(1-t,t,0,0)
    if y<.47:return (upper,0,0,0),(1.,0,0,0)
    if y<.58:
        t=smooth((y-.47)/.11);return (upper,hips,0,0),(1-t,t,0,0)
    t=smooth((y-.58)/.18);return (hips,spine,0,0),(1-t,t,0,0)


HEAD={9,10,11,14,15,16,28,29,30}
BOOTS={5:'l',6:'r'}
ARMS={0:'l',1:'r',12:'l',13:'r',26:'l',27:'r'}
TORSO_RIGID={2,3,4,7,8,19,20,21,22,24,25}
TOOL=set(range(31,38))


def build():
    old,new,tools=GLB(OLD),GLB(BASE),GLB(TOOLS)
    nd=new.d;od=old.d
    if len(nd.get('skins',[]))!=1 or len(nd['skins'][0]['joints'])!=23:raise RuntimeError('Rig_Medium source invalid')
    if len(od.get('meshes',[]))!=38:raise RuntimeError('V0.44 source topology changed')
    # The base contributes hierarchy, inverse bind matrices and bone rest pose
    # only. Remove every Ranger mesh payload and material/texture reference.
    ranger_mesh_names=[m.get('name') for m in nd.get('meshes',[])]
    nd['meshes']=[];nd['materials']=copy.deepcopy(od['materials'])
    for key in ('images','textures','samplers'):
        nd.pop(key,None)
    for node in nd['nodes']:
        node.pop('mesh',None);node.pop('skin',None)
    rig_node=next(i for i,n in enumerate(nd['nodes']) if n.get('name')=='Rig_Medium')
    skeleton_nodes=set(nd['skins'][0]['joints'])
    nd['nodes'][rig_node]['children']=[i for i in nd['nodes'][rig_node].get('children',[]) if i in skeleton_nodes]
    joint={nd['nodes'][node]['name']:slot for slot,node in enumerate(nd['skins'][0]['joints'])}
    required=['hips','spine','chest','head','upperarm.l','upperarm.r','lowerarm.l','lowerarm.r','wrist.l','wrist.r','hand.l','hand.r','foot.l','foot.r','lowerleg.l','lowerleg.r','upperleg.l','upperleg.r']
    if any(name not in joint for name in required):raise RuntimeError('Missing joints')
    handslot_node=next(i for i,n in enumerate(nd['nodes']) if n.get('name')=='handslot.r')
    imported=[];tool_nodes=[];counts={'vertices':0,'rigid_vertices':0,'blended_vertices':0}
    for mesh_id,source in enumerate(od['meshes']):
        primitives=[]
        for primitive in source['primitives']:
            attributes=primitive['attributes'];positions=[tuple(map(float,p)) for p in old.read(attributes['POSITION'])]
            normals=[normalize(tuple(map(float,n))) for n in old.read(attributes['NORMAL'])]
            indices=[int(x[0]) for x in old.read(primitive['indices'])]
            if mesh_id in TOOL:
                transformed=[transform_tool(p,n) for p,n in zip(positions,normals)]
                positions=[x[0] for x in transformed];normals=[x[1] for x in transformed]
                attrs={'POSITION':new.append(positions,'VEC3',5126,34962,True),
                       'NORMAL':new.append(normals,'VEC3',5126,34962)}
            else:
                if mesh_id in ARMS:
                    side=1 if ARMS[mesh_id]=='l' else -1
                    transformed=[transform_arm(p,n,side) for p,n in zip(positions,normals)]
                    positions=[x[0] for x in transformed];normals=[x[1] for x in transformed]
                pairs=[]
                for position in positions:
                    if mesh_id in ARMS:pairs.append(arm_weights(position,ARMS[mesh_id],joint))
                    elif mesh_id in HEAD:pairs.append(((joint['head'],0,0,0),(1.,0,0,0)))
                    elif mesh_id in BOOTS:pairs.append(((joint[f'foot.{BOOTS[mesh_id]}'],0,0,0),(1.,0,0,0)))
                    elif mesh_id==18:pairs.append(leg_weights(position,joint))
                    elif mesh_id==17:
                        t=smooth((position[1]-1.15)/.16);pairs.append(((joint['chest'],joint['head'],0,0),(1-t,t,0,0)))
                    elif mesh_id in TORSO_RIGID:pairs.append(((joint['chest'],0,0,0),(1.,0,0,0)))
                    else:pairs.append(torso_weights(position,joint))
                counts['vertices']+=len(positions)
                counts['rigid_vertices']+=sum(sum(w>.999 for w in pair[1])==1 for pair in pairs)
                counts['blended_vertices']+=sum(sum(w>1e-6 for w in pair[1])>1 for pair in pairs)
                attrs={'POSITION':new.append(positions,'VEC3',5126,34962,True),
                       'NORMAL':new.append(normals,'VEC3',5126,34962),
                       'JOINTS_0':new.append((p[0] for p in pairs),'VEC4',5121,34962),
                       'WEIGHTS_0':new.append((p[1] for p in pairs),'VEC4',5126,34962)}
            primitives.append({'attributes':attrs,'indices':new.append(((i,) for i in indices),'SCALAR',5123 if len(positions)<65536 else 5125,34963),'material':primitive['material'],'mode':4})
        mesh_index=len(nd['meshes']);name='V044_'+source['name'];nd['meshes'].append({'name':name,'primitives':primitives})
        node_index=len(nd['nodes']);node={'name':name,'mesh':mesh_index}
        if mesh_id not in TOOL:node['skin']=0
        nd['nodes'].append(node)
        if mesh_id in TOOL:tool_nodes.append(node_index)
        else:nd['nodes'][rig_node]['children'].append(node_index)
        imported.append(name)
    tool_parent=len(nd['nodes']);nd['nodes'].append({'name':'V044_Spade','children':tool_nodes,'extras':{'role':'gardening_spade','mount':'static V0.44 hand-surface PCA axis'}})
    nd['nodes'][handslot_node].setdefault('children',[]).append(tool_parent)
    # Embed only Digging, copied from the official Tools GLB.
    action=next(a for a in tools.d['animations'] if a.get('name')=='Digging')
    source_node_names={i:n.get('name') for i,n in enumerate(tools.d['nodes'])}
    target_by_name={n.get('name'):i for i,n in enumerate(nd['nodes'])}
    samplers=[]
    for source_sampler in action['samplers']:
        sampler={}
        for key in ('input','output'):
            accessor=tools.d['accessors'][source_sampler[key]];values=tools.read(source_sampler[key])
            sampler[key]=new.append(values,accessor['type'],accessor['componentType'],None,key=='input')
        if 'interpolation' in source_sampler:sampler['interpolation']=source_sampler['interpolation']
        samplers.append(sampler)
    channels=[]
    for channel in action['channels']:
        source_name=source_node_names[channel['target']['node']]
        if source_name not in target_by_name:raise RuntimeError('Animation target missing: '+str(source_name))
        channels.append({'sampler':channel['sampler'],'target':{'node':target_by_name[source_name],'path':channel['target']['path']}})
    nd['animations']=[{'name':'Digging','samplers':samplers,'channels':channels,'extras':{'source':'Rig_Medium_Tools.glb / Digging','modified':False}}]
    nd['asset']['generator']='Komorebi V0.44 Rig_Medium builder; geometry V0.44 only'
    nd.setdefault('extensionsUsed',[])
    nd['extras']={'version':'v044-rig-medium','mesh_source':'gardener-v044.glb','rig_source':'Rig_Medium','ranger_meshes_in_output':False,'v051_meshes_in_output':False}
    new.save(OUTPUT)
    tested=GLB(OUTPUT)
    active=set()
    def walk(index):
        if index in active:return
        active.add(index)
        for child in tested.d['nodes'][index].get('children',[]):walk(child)
    for node in tested.d['scenes'][tested.d.get('scene',0)]['nodes']:walk(node)
    active_meshes=[tested.d['meshes'][tested.d['nodes'][i]['mesh']]['name'] for i in active if 'mesh' in tested.d['nodes'][i]]
    if len(active_meshes)!=38 or any(name.startswith('Ranger_') for name in active_meshes):raise RuntimeError(active_meshes)
    report={'output':str(OUTPUT.relative_to(ROOT)),'bytes':OUTPUT.stat().st_size,'source_meshes':len(od['meshes']),'active_meshes':active_meshes,
            'removed_ranger_mesh_payloads':ranger_mesh_names,'materials':[m['name'] for m in nd['materials']],
            'joints':len(nd['skins'][0]['joints']),'embedded_animations':['Digging'],'animation_modified':False,
            'tool_parent':'handslot.r','tool_calibration':{'axis':TOOL_AXIS,'center':TOOL_CENTER,'source_axis_q':'.784 - source_y'},'counts':counts}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('V044_RIG_MEDIUM_OK',json.dumps({k:report[k] for k in ('bytes','source_meshes','joints','embedded_animations','counts')}))
    return report


if __name__=='__main__':build()
