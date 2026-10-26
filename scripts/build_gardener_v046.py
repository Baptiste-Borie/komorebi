#!/usr/bin/env python3
"""Make the V0.47 gardener *from the original KayKit Ranger GLB*.

Preserves the official Rig_Medium, bone weights and mesh topology. Removes
only independent, identified mesh components (cape, quiver, beard, scarf,
RPG belt). Adds a chest-fitted bib and straps, skinned to the existing rig.
No Blender, Python packages or generated rig required.

Usage: python3 scripts/build_gardener_v046.py
Optional: python3 scripts/build_gardener_v046.py path/to/Ranger.glb path/to/gardener-v047.glb
"""
from pathlib import Path
from collections import defaultdict
import json, struct, math, sys

ROOT = Path(__file__).resolve().parent.parent
DEFAULT = ROOT/'public/assets/kaykit-v045'

def glb_read(path):
    raw = path.read_bytes()
    if raw[:4] != b'glTF' or struct.unpack_from('<I',raw,4)[0]!=2:
        raise ValueError('Source non GLB 2.0 : '+str(path))
    off=12; chunks={}
    while off<len(raw):
        n,tag=struct.unpack_from('<I4s',raw,off);off+=8
        chunks[tag]=raw[off:off+n];off+=n
    return json.loads(chunks[b'JSON']),bytearray(chunks[b'BIN\x00'])

def build(source,output):
    doc,blob=glb_read(source)
    meshes=doc['meshes'];names=[m['name'] for m in meshes]
    expected=['Ranger_ArmLeft','Ranger_ArmRight','Ranger_Body','Ranger_Cape','Ranger_Head','Ranger_LegLeft','Ranger_LegRight','Ranger_Quiver']
    if names[:len(expected)]!=expected or len(doc.get('skins',[]))!=1:
        raise RuntimeError('Maillage Ranger KayKit différent de celui audité. Génération annulée : '+str(names))
    if not 20 <= len(doc['skins'][0]['joints']) <= 30:
        raise RuntimeError('Rig KayKit invalide')
    # All transformations below refer to bind-pose coordinates in the actual GLB.
    # No trial-and-error bounding-box clothing at runtime.
    dtypes={5121:('B',1),5123:('H',2),5125:('I',4),5126:('f',4)}
    dims={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
    def accessor(i):
        a=doc['accessors'][i];view=doc['bufferViews'][a['bufferView']];code,n=dtypes[a['componentType']];count=dims[a['type']]
        stride=view.get('byteStride',n*count)
        start=view.get('byteOffset',0)+a.get('byteOffset',0)
        return [struct.unpack_from('<'+code*count,blob,start+j*stride) for j in range(a['count'])]
    def add_bytes(raw,target=None):
        while len(blob)%4: blob.append(0)
        start=len(blob);blob.extend(raw)
        if target is None: target=34963
        index=len(doc['bufferViews'])
        doc['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':len(raw),'target':target})
        return index
    def add_accessor(values,fmt,kind,component,target=None):
        if not values: raise RuntimeError('Table vide : '+kind)
        arity=dims[kind]
        packed=b''.join(struct.pack('<'+fmt*arity,*(v if isinstance(v,(tuple,list)) else (v,))) for v in values)
        view=add_bytes(packed,target)
        a={'bufferView':view,'componentType':component,'count':len(values),'type':kind}
        if kind=='VEC3' and component==5126 and fmt=='f':
            a['min']=[min(v[k] for v in values) for k in range(3)];a['max']=[max(v[k] for v in values) for k in range(3)]
        i=len(doc['accessors']);doc['accessors'].append(a);return i
    def add_material(name,rgb,rough=1):
        d={'name':name,'doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':[*rgb,1],'metallicFactor':0,'roughnessFactor':rough}}
        i=len(doc['materials']);doc['materials'].append(d);return i
    denim=add_material('KOMOREBI • sauge/bleu salopette',(0.255,.425,.420))
    denim_dark=add_material('KOMOREBI • poche surpiquée',(.195,.338,.335))
    seams=add_material('KOMOREBI • coutures en toile',(.52,.61,.52))
    metal=add_material('KOMOREBI • boutons cuivrés',(.69,.50,.28),.76)
    shirt=add_material('KOMOREBI • manches sauge clair',(.62,.68,.54))
    skin=add_material('KOMOREBI • mains et avant-bras',(.74,.51,.34))
    # Connected-component analysis uses actual triangle indices, not heuristics
    # about world-space bone transforms. We preserve all source skin attributes.
    def components(mesh):
        pr=mesh['primitives'][0]
        xyz=accessor(pr['attributes']['POSITION']);tris=accessor(pr['indices'])
        flat=[int(t[0]) for t in tris]; parent=list(range(len(xyz)))
        def find(v):
            while parent[v]!=v:
                parent[v]=parent[parent[v]];v=parent[v]
            return v
        for k in range(0,len(flat),3):
            r=find(flat[k]);parent[find(flat[k+1])]=r;parent[find(flat[k+2])]=r
        groups=defaultdict(list)
        for v in range(len(xyz)):groups[find(v)].append(v)
        sorted_groups=sorted(groups.values(),key=len,reverse=True)
        rank={v:n for n,g in enumerate(sorted_groups) for v in g}
        return xyz,[flat[k:k+3] for k in range(0,len(flat),3)],rank,sorted_groups
    removed={}
    for m in meshes[:len(expected)]:
        name=m['name']
        if name in ('Ranger_Cape','Ranger_Quiver'):continue
        xyz,tris,rank,groups=components(m)
        if name=='Ranger_Head':
            # Flatten both dark brow shells to reduce the harsh RPG expression.
            # Preserve every vertex, skin weight and face texture.
            if len(groups)<16 or [len(groups[i]) for i in (7,8)] != [58,55]:
                raise RuntimeError('Sourcils du Ranger inattendus, modification annulée')
            positions=list(xyz)
            for index in (7,8):
                avg_y=sum(xyz[v][1] for v in groups[index])/len(groups[index])
                for v in groups[index]:
                    x,y,z=xyz[v]
                    positions[v]=(x,avg_y+(y-avg_y)*.68-.008,z)
            m['primitives'][0]['attributes']['POSITION']=add_accessor(positions,'f','VEC3',5126,34962)
            # Isolated brown moustache halves and tiny chin goatee.
            if len(groups)<16 or len(groups[2])!=63 or len(groups[14])!=35:
                raise RuntimeError('Visage KayKit inattendu : ne pas supprimer des composants au hasard')
            skip={2,3,14,15}
        elif name=='Ranger_Body':
            # The blue shawl is three disconnected pieces. The original
            # *beige shirt* underneath remains; all collar skinning is kept.
            if len(groups)<10 or len(groups[1])!=89 or len(groups[2])!=85:
                raise RuntimeError('Corps KayKit inattendu : écharpe non retirée')
            fabric_upper={0,27,28,30,31}
            fabric_lower={3,34,35,45,56,92}
            waistband={6,29,33,37,46,47,63,91,93}
            allowed=fabric_upper
            skip=set(range(len(groups)))-allowed
        else:skip=set()
        if name.startswith('Ranger_Arm'):
            # Components 0-2: original body/arm/hand. The others are leather
            # cuffs, thick shoulder armor, colored bands and trim. Retain
            # those topology pieces (to avoid holes) but slim and recolor them.
            if len(groups)!=19 or [len(groups[i]) for i in (0,1,2,7,14)]!=[89,64,64,32,26]:
                raise RuntimeError('Armature KayKit incompatible : bras non modifié')
            adjusted=list(xyz)
            for i in range(len(groups)):
                if i in (0,1,2): continue
                for v in groups[i]:
                    x,y,z=xyz[v]
                    adjusted[v]=(x,1.105+(y-1.105)*.77,z*.77)
            m['primitives'][0]['attributes']['POSITION']=add_accessor(adjusted,'f','VEC3',5126,34962)
        kept=[t for t in tris if rank[t[0]] not in skip]
        removed[name]=len(tris)-len(kept)
        attributes=m['primitives'][0]['attributes'];mat=m['primitives'][0]['material']
        def primitive(ts,material):
            ai=add_accessor([i for tri in ts for i in tri],'H','SCALAR',5123,34963)
            return {'attributes':attributes,'indices':ai,'material':material,'mode':4}
        if name.startswith('Ranger_Arm'):
            # Make ordinary shirt cuffs and exposed forearms instead of RPG
            # bracers. Pieces are individually classified in the audited GLB.
            sleeve={0,1,4,5,6,10,11,12,13}
            natural={2,3,7,8,9,14,15,16,17,18}
            a=[t for t in kept if rank[t[0]] in sleeve]
            b=[t for t in kept if rank[t[0]] in natural]
            m['primitives']=[primitive(a,shirt),primitive(b,skin)]
        elif name=='Ranger_Body':
            # Keep native shirt, native lower fabric and a few true waistband
            # meshes. All oversized leather RPG satchels are physically gone.
            m['primitives']=[primitive(kept,mat)]
        elif name.startswith('Ranger_Leg'):
            # Component 0 is the separate trousers thigh, 1+ are boot parts.
            pants=[t for t in kept if rank[t[0]]==0]
            boots=[t for t in kept if rank[t[0]]!=0]
            m['primitives']=[primitive(pants,denim),primitive(boots,mat)]
        else:
            m['primitives']=[primitive(kept,mat)]
    # Remove only the two independent RPG props from the scene graph.
    rig=next(n for n in doc['nodes'] if n.get('name')=='Rig_Medium')
    prop_nodes={i for i,n in enumerate(doc['nodes']) if n.get('name') in ('Ranger_Cape','Ranger_Quiver')}
    if len(prop_nodes)!=2:raise RuntimeError('Accessoires RPG introuvables')
    rig['children']=[n for n in rig['children'] if n not in prop_nodes]
    # Real cloth surfaces: panel is curved to follow the source shirt rather
    # than a cylinder placed in front of the face. Same 23-bone skin as Ranger.
    chest=doc['skins'][0]['joints'].index(next(i for i,n in enumerate(doc['nodes']) if n.get('name')=='chest'))
    spine=doc['skins'][0]['joints'].index(next(i for i,n in enumerate(doc['nodes']) if n.get('name')=='spine'))
    pos=[];nor=[];joints=[];weights=[];tris=[]
    def vertex(p,n=(0,0,1)):
        pos.append(tuple(float(t) for t in p));nor.append(n)
        t=max(0.,min(1.,(p[1]-.70)/.37))
        joints.append((spine,chest,0,0));weights.append((1-t,t,0,0));return len(pos)-1
    def grid(rows,material):
        first=len(pos);w=len(rows[0]);
        for row in rows:
            for p in row:vertex(p)
        ix=[]
        for k in range(len(rows)-1):
            for c in range(w-1):
                a=first+k*w+c;b=a+1;d=a+w;e=d+1
                ix.extend((a,b,e,a,e,d))
        return {'attributes':{'POSITION':add_accessor(pos[first:],'f','VEC3',5126,34962),
                              'NORMAL':add_accessor(nor[first:],'f','VEC3',5126,34962),
                              'JOINTS_0':add_accessor(joints[first:],'B','VEC4',5121,34962),
                              'WEIGHTS_0':add_accessor(weights[first:],'f','VEC4',5126,34962)},
                'indices':add_accessor([x-first for x in ix],'H','SCALAR',5123,34963),'material':material,'mode':4}
    # Each grid is its *own primitive*, so indices are relative to its attributes.
    panels=[]
    # Actual Ranger tunic front surface: z~.34 at y=.7, .31 at y=.9, .29 at y=1.0.
    panels.append(grid([
      [(-.275,.665,.369),(0,.665,.391),(.275,.665,.369)],
      [(-.274,.780,.366),(0,.780,.365),(.274,.780,.366)],
      [(-.218,.925,.335),(0,.925,.334),(.218,.925,.335)],
      [(-.174,1.050,.298),(0,1.050,.313),(.174,1.050,.298)]
    ],denim))
    # Overalls straps are ribbons that wrap over each shoulder to the back.
    for sign in (-1,1):
        def strap(x,y,z,w):
            return [(sign*(x-w/2),y,z),(sign*(x+w/2),y,z)]
        # winding is inverted on one side; material is double sided.
        panels.append(grid([
          strap(.145,1.038,.312,.095),strap(.192,1.152,.282,.095),
          strap(.251,1.231,.150,.090),strap(.258,1.244,-.045,.09),
          strap(.245,1.17,-.215,.09),strap(.235,.765,-.333,.09)
        ],denim))
    # Proper sewn-on front pocket and two tiny copper rivets.
    panels.append(grid([
       [(-.127,.815,.389),(0,.815,.395),(.127,.815,.389)],
       [(-.110,.905,.369),(0,.905,.380),(.110,.905,.369)]
    ],denim_dark))
    for sign in (-1,1):
        x=.15*sign
        panels.append(grid([
          [(x-.021,1.03,.324),(x+.021,1.03,.324)],
          [(x-.021,1.067,.306),(x+.021,1.067,.306)]
        ],metal))
    # A soft, three-dimensional waist piece joins the native KayKit trouser legs
    # to the bib. It follows hips/spine while the character walks, unlike a
    # rigid cylinder parented to the scene. Silhouette measured from Ranger.
    hips=doc['skins'][0]['joints'].index(next(i for i,n in enumerate(doc['nodes']) if n.get('name')=='hips'))
    waist_pos=[];waist_nor=[];waist_joint=[];waist_weight=[];waist_tri=[]
    sides=12
    for y,rx,rz in [(0.43,.312,.265),(0.52,.345,.289),(0.62,.369,.332),(0.73,.330,.326)]:
        for t in range(sides):
            a=t*math.tau/sides;cs,sn=math.cos(a),math.sin(a)
            waist_pos.append((rx*cs,y,rz*sn))
            waist_nor.append((cs,0,sn))
            f=max(0.,min(1.,(y-.43)/.30))
            waist_joint.append((hips,spine,0,0))
            waist_weight.append((1-f,f,0,0))
    for row in range(3):
        for k in range(sides):
            a=row*sides+k;b=row*sides+(k+1)%sides;c=a+sides;d=b+sides
            waist_tri.extend((a,c,b,b,c,d))
    panels.append({'attributes':{
      'POSITION':add_accessor(waist_pos,'f','VEC3',5126,34962),
      'NORMAL':add_accessor(waist_nor,'f','VEC3',5126,34962),
      'JOINTS_0':add_accessor(waist_joint,'B','VEC4',5121,34962),
      'WEIGHTS_0':add_accessor(waist_weight,'f','VEC4',5126,34962)},
      'indices':add_accessor(waist_tri,'H','SCALAR',5123,34963),
      'material':denim,'mode':4})
    # One single skinned mesh with separate material groups for bib/straps.
    i=len(meshes);meshes.append({'name':'Gardener_Overalls_BibAndStraps','primitives':panels})
    node=len(doc['nodes']);doc['nodes'].append({'name':'Gardener_Overalls','mesh':i,'skin':0})
    rig['children'].append(node)
    doc['buffers'][0]['byteLength']=len(blob)
    js=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode('utf8')
    js+=b' '*((-len(js))%4)
    blob+=b'\x00'*(-len(blob)%4)
    total=12+8+len(js)+8+len(blob)
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_bytes(b'glTF'+struct.pack('<II',2,total)+struct.pack('<I4s',len(js),b'JSON')+js+
                       struct.pack('<I4s',len(blob),b'BIN\x00')+blob)
    print('Komorebi V0.47 :',output,'| taille',output.stat().st_size,'| maillages RPG supprimés',removed)

if __name__=='__main__':
    src=Path(sys.argv[1]) if len(sys.argv)>1 else None
    if src is None:
        manifest=json.loads((DEFAULT/'manifest.json').read_text())
        src=ROOT/'public'/manifest['model'].lstrip('/')
    dst=Path(sys.argv[2]) if len(sys.argv)>2 else DEFAULT/'gardener-v047.glb'
    build(src,dst)
