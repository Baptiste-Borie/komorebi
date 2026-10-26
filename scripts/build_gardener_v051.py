#!/usr/bin/env python3
"""Komorebi V0.51: genuine V0.44/V0.47 mesh hybrid on the KayKit Rig_Medium.

Sources: actual v044 GLB in public/assets, and v047 generated from the free
KayKit Ranger. Copies old clothing/hat/hair vertex topology and materials;
retains V0.47 Ranger_Head, Ranger_LegLeft and Ranger_LegRight bit for bit.
Upper-body pieces receive new 23-bone KayKit weights. Old arms are reposed
from vertical V0.44 to the KayKit bind-pose and split across upperarm,
lowerarm, wrist, hand for animation. No Blender/additional pip dependencies.

The visual result REQUIRES human review in multiple animated poses.
"""
from pathlib import Path
from collections import Counter
import copy
import json
import math
import struct
import sys

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'public/assets'
OLD = ASSETS / 'gardener-v044.glb'
KAYKIT = ASSETS / 'kaykit-v045'
NEW = KAYKIT / 'gardener-v047.glb'
OUTPUT = KAYKIT / 'gardener-v051.glb'

COMP = {5121: ('B', 1), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
DIM = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


class GLB:
    def __init__(self, path):
        self.path = Path(path)
        data = self.path.read_bytes()
        if data[:4] != b'glTF' or struct.unpack_from('<I', data, 4)[0] != 2:
            raise ValueError(f'GLB 2 invalide : {path}')
        pos = 12
        chunks = {}
        while pos < len(data):
            length, tag = struct.unpack_from('<I4s', data, pos)
            pos += 8
            chunks[tag] = data[pos:pos + length]
            pos += length
        self.d = json.loads(chunks[b'JSON'])
        self.bin = bytearray(chunks[b'BIN\x00'])

    def read(self, i):
        access = self.d['accessors'][i]
        if 'sparse' in access or 'bufferView' not in access:
            raise ValueError(f'Accessor {i} sparse non pris en charge')
        view = self.d['bufferViews'][access['bufferView']]
        fmt, width = COMP[access['componentType']]
        size = DIM[access['type']]
        stride = view.get('byteStride', width * size)
        start = view.get('byteOffset', 0) + access.get('byteOffset', 0)
        return [struct.unpack_from('<' + fmt * size, self.bin, start + k * stride)
                for k in range(access['count'])]

    def append(self, values, kind, component, target=34962):
        values = list(values)
        if not values: raise ValueError('Accessor vide')
        fmt, width = COMP[component]
        width *= DIM[kind]
        body = b''.join(struct.pack('<' + fmt * DIM[kind], *v) for v in values)
        while len(self.bin) % 4: self.bin.append(0)
        start = len(self.bin)
        self.bin.extend(body)
        view_id = len(self.d['bufferViews'])
        self.d['bufferViews'].append({
            'buffer': 0, 'byteOffset': start, 'byteLength': len(body), 'target': target,
        })
        a = {'bufferView': view_id, 'componentType': component, 'count': len(values), 'type': kind}
        if kind == 'VEC3' and component == 5126:
            a['min'] = [min(v[c] for v in values) for c in range(3)]
            a['max'] = [max(v[c] for v in values) for c in range(3)]
        index = len(self.d['accessors'])
        self.d['accessors'].append(a)
        return index

    def save(self, path):
        self.d['buffers'][0]['byteLength'] = len(self.bin)
        payload = json.dumps(self.d, separators=(',', ':'), ensure_ascii=False).encode('utf8')
        payload += b' ' * (-len(payload) % 4)
        binary = self.bin + b'\x00' * (-len(self.bin) % 4)
        out = (b'glTF' + struct.pack('<II', 2, 12 + 8 + len(payload) + 8 + len(binary))
               + struct.pack('<I4s', len(payload), b'JSON') + payload
               + struct.pack('<I4s', len(binary), b'BIN\x00') + binary)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        Path(path).write_bytes(out)


def smooth(x):
    x = max(0., min(1., x))
    return x * x * (3. - 2. * x)


def normalize(a):
    mag = math.sqrt(sum(x * x for x in a))
    return tuple(x / mag for x in a) if mag > 1.e-9 else (0., 0., 1.)


def transform_arm(pos, normal, side):
    """Repose old V0.44 straight-down arms into native KayKit lateral T-pose.

    Original shoulder: x=+/-0.40, y~=1.05. New shoulder ~= +/-0.25, y=1.105.
    The long-axis adapts length to new forearm and hand anchors. Preserves
    cross-sections; does NOT turn the entire arm into a giant thick cylinder.
    """
    x, y, z = pos
    nx, ny, nz = normal
    signed = side * (x - side * .4)
    nxpos = side * (.249 + 1.245 * (1.053 - y))
    nypos = 1.108 + signed * .84
    # Keep old shape/z depth. Narrow only very slightly to match new shoulders.
    npos = (nxpos, nypos, z * .96)
    # Inverse transpose of (X <- Y, Y <- X) transform; unit normalized.
    nnorm = normalize((-side * ny / 1.245, side * nx / .84, nz / .96))
    return npos, nnorm


def arm_weights(pos, side, joint):
    progress = (abs(pos[0]) - .249) / .69
    ids = [joint[f'upperarm.{side}'], joint[f'lowerarm.{side}'],
           joint[f'wrist.{side}'], joint[f'hand.{side}']]
    q = [0., 0., 0., 0.]
    # C^1 smooth transitions instead of hard-cut 'parts' or overlapping cuffs.
    if progress < .38:
        q[0] = 1.
    elif progress < .56:
        t = smooth((progress - .38) / .18)
        q[0], q[1] = 1 - t, t
    elif progress < .76:
        q[1] = 1.
    elif progress < .85:
        t = smooth((progress - .76) / .09)
        q[1], q[2] = 1 - t, t
    elif progress < .92:
        t = smooth((progress - .85) / .07)
        q[2], q[3] = 1 - t, t
    else:
        q[3] = 1.
    return tuple(ids), tuple(q)


def torso_weights(pos, joint):
    x, y, z = pos
    lower = smooth((y - .46) / .21)
    upper = smooth((y - .66) / .34)
    a = (1. - lower)
    b = lower * (1. - upper)
    c = lower * upper
    # Blend upper sleeve openings with the native upperarm deformation.
    toward_shoulder = smooth((abs(x) - .23) / .18) * smooth((y - .82) / .18)
    shoulder = .47 * toward_shoulder
    a *= 1 - shoulder; b *= 1 - shoulder; c *= 1 - shoulder
    side = 'l' if x >= 0 else 'r'
    return ((joint['hips'], joint['spine'], joint['chest'], joint[f'upperarm.{side}']),
            (a, b, c, shoulder))


def head_weights(joint):
    return (joint['head'], 0, 0, 0), (1., 0., 0., 0.)


def clip_above(verts, normals, indices, plane):
    """Trim OLD overalls to its top waist/seat section. NEW leg geometry stays.

    Clip each triangle at a horizontal plane and interpolate edge normals, to
    avoid crude holes caused by dropping entire triangles near the belt line.
    """
    out_v = []
    out_n = []
    out_i = []
    for off in range(0, len(indices), 3):
        tri = [(verts[indices[off+k]], normals[indices[off+k]]) for k in range(3)]
        poly = []
        for n in range(3):
            p, pn = tri[n]
            q, qn = tri[(n+1)%3]
            above_p = p[1] >= plane
            above_q = q[1] >= plane
            if above_p: poly.append((p, pn))
            if above_p != above_q:
                t = (plane - p[1]) / (q[1] - p[1])
                v = tuple(p[k] + (q[k]-p[k])*t for k in range(3))
                normal = normalize(tuple(pn[k] + (qn[k]-pn[k])*t for k in range(3)))
                poly.append((v, normal))
        for i in range(1, len(poly)-1):
            base = len(out_v)
            for v, n in (poly[0], poly[i], poly[i+1]):
                out_v.append(v); out_n.append(n)
            out_i.extend((base, base+1, base+2))
    if not out_i: raise RuntimeError('Salopette V0.44 découpée en géométrie vide')
    return out_v, out_n, out_i


# Precise old mesh selection: cloth, hair and hat, but NEVER old boots, legs,
# face, mouth, eyes or shovel. Those regions use original KayKit V0.47.
PARTS = {
    0: 'bras_gauche', 1: 'bras_droit',
    2: 'couture_bavette_gauche', 3: 'couture_bavette_droite', 4: 'bavette_ancienne',
    7: 'bouton_gauche', 8: 'bouton_droit',
    12: 'revers_manche_gauche', 13: 'revers_manche_droite',
    14: 'cheveux_anciens', 15: 'rebord_chapeau', 16: 'ruban_chapeau',
    17: 'cou_ancien', 18: 'taille_salopette',
    19: 'couture_poche', 20: 'broderie_poche', 21: 'poche_ancienne',
    22: 'broderie_feuille', 23: 'tee_shirt_ancien',
    24: 'bretelle_gauche', 25: 'bretelle_droite',
    26: 'manche_gauche', 27: 'manche_droite',
    29: 'chapeau_bord', 30: 'chapeau_couronne',
}
ARM = {0, 1, 12, 13, 26, 27}
HEAD = {14, 15, 16, 29, 30}


def remove_ranger_hair(new):
    """Strip connected Ranger hair islands, preserve the SKIN face, eyes/brows.

    Component ID checks are geometry-based (y range/size); no guessed texture
    color replacement or covering old hair with a second shell.
    """
    mesh = next(m for m in new.d['meshes'] if m['name'] == 'Ranger_Head')
    if len(mesh['primitives']) != 1:
        raise RuntimeError('Ranger_Head inattendu : 1 primitive attendue')
    prim = mesh['primitives'][0]
    xyz = new.read(prim['attributes']['POSITION'])
    indices = [int(v[0]) for v in new.read(prim['indices'])]
    used = set(indices)
    parent = {i: i for i in used}
    def find(v):
        while parent[v] != v:
            parent[v] = parent[parent[v]]
            v = parent[v]
        return v
    for t in range(0, len(indices), 3):
        a, b, c = map(find, indices[t:t+3])
        parent[b] = a
        parent[c] = a
    groups = {}
    for i in used:
        groups.setdefault(find(i), []).append(i)
    hair = set()
    removed_components = []
    for idx, vertices in groups.items():
        yy = [xyz[v][1] for v in vertices]
        span = max(yy)-min(yy)
        # True Ranger hair cap / side locks have 48/58/63/167 vertices, and
        # extend vertically >0.45m. Brows span <0.15; face is a 138-vertex
        # connected component. Protect facial volumes without assumptions.
        if len(vertices) in (48, 58, 63, 167) and span > .45:
            hair.add(idx)
            removed_components.append((len(vertices), round(span, 3)))
    if len(removed_components) != 6:
        raise RuntimeError('Identification cheveux Ranger ambiguë : ' + str(removed_components))
    kept = [indices[t:t+3] for t in range(0, len(indices), 3)
            if find(indices[t]) not in hair]
    prim['indices'] = new.append(((i,) for tri in kept for i in tri), 'SCALAR', 5123, 34963)
    return removed_components


def build(old_file=OLD, new_file=NEW, output=OUTPUT):
    old, new = GLB(old_file), GLB(new_file)
    od, nd = old.d, new.d
    if len(od['skins']) != 1 or len(od['skins'][0]['joints']) != 10:
        raise RuntimeError('Ce GLB V0.44 ne contient pas les 10 os attendus. Annulé.')
    if len(nd['skins']) != 1 or len(nd['skins'][0]['joints']) != 23:
        raise RuntimeError('Le rig KayKit doit posséder 23 os. Annulé.')
    expected_new = ['Ranger_ArmLeft', 'Ranger_ArmRight', 'Ranger_Body', 'Ranger_Cape',
                    'Ranger_Head', 'Ranger_LegLeft', 'Ranger_LegRight', 'Ranger_Quiver']
    if [m.get('name') for m in nd['meshes'][:8]] != expected_new:
        raise RuntimeError('Structure Ranger V0.47 inattendue. Annulé.')
    assert od['meshes'][14]['name'].startswith('Hair')
    assert od['meshes'][23]['name'].startswith('Shirt')
    assert od['meshes'][18]['name'].startswith('Overalls')
    joint = {nd['nodes'][n]['name']: i for i, n in enumerate(nd['skins'][0]['joints'])}
    for required in ['hips', 'spine', 'chest', 'head', 'upperarm.l', 'upperarm.r',
                     'lowerarm.l', 'lowerarm.r', 'wrist.l', 'wrist.r', 'hand.l', 'hand.r']:
        if required not in joint:
            raise RuntimeError('Os KayKit introuvable : ' + required)
    # Remove original Ranger hair before adding the V0.44 haircut: ONE layer.
    hair_removed = remove_ranger_hair(new)
    # Retain SOURCE Ranger_LegLeft/Right mesh indices and skin facial geometry.
    # Hair triangles are the only edited part of Ranger_Head.
    # Remove other V0.47 upper-body nodes.
    rig = next(n for n in nd['nodes'] if n.get('name') == 'Rig_Medium')
    kept_original = {'Ranger_Head', 'Ranger_LegLeft', 'Ranger_LegRight'}
    removed_node_ids = {i for i, node in enumerate(nd['nodes']) if node.get('mesh') is not None
                        and node.get('name') not in kept_original}
    rig['children'] = [i for i in rig['children'] if i not in removed_node_ids]
    if not all(any(nd['nodes'][i].get('name') == name for i in rig['children']) for name in kept_original):
        raise RuntimeError('Head/LegLeft/LegRight doivent rester attachés à Rig_Medium')

    # Color-match *trousers* to old salopette without changing geometry or boots.
    old_overalls = copy.deepcopy(od['materials'][2])
    old_overalls['name'] = 'HYBRIDE • pantalon Ranger / toile V0.44'
    trouser_mat = len(nd['materials'])
    nd['materials'].append(old_overalls)
    for name in ('Ranger_LegLeft', 'Ranger_LegRight'):
        mesh = next(m for m in nd['meshes'] if m['name'] == name)
        if len(mesh['primitives']) != 2:
            raise RuntimeError('Deux primitives pantalon/chaussure attendues dans '+name)
        mesh['primitives'][0]['material'] = trouser_mat  # boots (primitive 1) untouched

    materials_at = len(nd['materials'])
    for source_mat in od['materials']:
        nd['materials'].append(copy.deepcopy(source_mat))
    imported = []
    vertex_count = 0
    for mesh_id, short_name in PARTS.items():
        mesh = od['meshes'][mesh_id]
        new_primitives = []
        for prim in mesh['primitives']:
            if prim.get('mode', 4) != 4:
                raise RuntimeError('Triangles attendus : '+mesh['name'])
            attrib = prim['attributes']
            positions = [tuple(map(float, x)) for x in old.read(attrib['POSITION'])]
            normals = [normalize(x) for x in old.read(attrib['NORMAL'])]
            if 'indices' not in prim:
                inds = list(range(len(positions)))
            else:
                inds = [int(x[0]) for x in old.read(prim['indices'])]
            if mesh_id == 18:
                positions, normals, inds = clip_above(positions, normals, inds, .505)
            arm = mesh_id in ARM
            side = 'l' if mesh_id in (0, 12, 26) else 'r'
            if arm:
                pp, nn = [], []
                for pos, n in zip(positions, normals):
                    p, norm = transform_arm(pos, n, 1 if side == 'l' else -1)
                    pp.append(p); nn.append(norm)
                positions, normals = pp, nn
                pairs = [arm_weights(v, side, joint) for v in positions]
            elif mesh_id in HEAD:
                pairs = [head_weights(joint)] * len(positions)
            elif mesh_id == 17:
                # Neck follows both chest and head to hide the collar-to-face seam.
                pairs = [((joint['chest'], joint['head'], 0, 0),
                          (1 - smooth((p[1] - 1.12) / .19), smooth((p[1] - 1.12) / .19), 0., 0.))
                         for p in positions]
            else:
                pairs = [torso_weights(p, joint) for p in positions]
            joint_rows = [pair[0] for pair in pairs]
            weight_rows = [pair[1] for pair in pairs]
            attrs = {'POSITION': new.append(positions, 'VEC3', 5126),
                     'NORMAL': new.append(normals, 'VEC3', 5126),
                     'JOINTS_0': new.append(joint_rows, 'VEC4', 5121),
                     'WEIGHTS_0': new.append(weight_rows, 'VEC4', 5126)}
            idx_type = 5123 if len(positions) < 65536 else 5125
            new_primitives.append({'attributes': attrs,
                                   'indices': new.append(((i,) for i in inds), 'SCALAR', idx_type, 34963),
                                   'material': materials_at + prim['material'], 'mode': 4})
            vertex_count += len(positions)
        mesh_index = len(nd['meshes'])
        nd['meshes'].append({'name': f'Hybrid_v051_{short_name}', 'primitives': new_primitives})
        node_index = len(nd['nodes'])
        nd['nodes'].append({'name': f'Hybrid_v051_{short_name}', 'mesh': mesh_index, 'skin': 0})
        rig['children'].append(node_index)
        imported.append(short_name)

    # The source file is not modified; only the new GLB is written.
    new.save(output)
    report = {'version': '0.51', 'reference_v044': Path(old_file).name,
              'reference_v047': Path(new_file).name,
              'joints': len(nd['skins'][0]['joints']),
              'original_kept': ['Ranger_Head', 'Ranger_LegLeft', 'Ranger_LegRight'],
              'original_untouched_geometry': ['Ranger_LegLeft', 'Ranger_LegRight'],
              'original_head': 'source V0.47 skin/eyes/nose/brows with old Ranger hair islands removed',
              'removed_ranger_hair': hair_removed,
              'hybrid_parts': imported, 'imported_vertices': vertex_count,
              'arms': 'old V0.44 geometry reposed to KayKit T-pose; 4 joint zones (upperarm, lowerarm, wrist, hand)',
              'waist': 'v044 upper waist meshes clipped at y=0.505; native Ranger legs kept',
              'human_visual_approval': False}
    report_file = Path(output).with_suffix('.report.json')
    report_file.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    # Re-open to verify serialization, skin and exact source mesh indices retained.
    tested = GLB(output)
    assert len(tested.d['skins'][0]['joints']) == 23
    for name in ('Ranger_LegLeft', 'Ranger_LegRight', 'Ranger_Head'):
        before = next(m for m in nd['meshes'][:8] if m['name'] == name)
        after = next(m for m in tested.d['meshes'][:8] if m['name'] == name)
        assert before['primitives'][0]['attributes'] == after['primitives'][0]['attributes']
    print(f'✓ HYBRIDE V0.51 : {output} ({Path(output).stat().st_size:,} octets)')
    print(f'✓ {len(imported)} parties V0.44 réelles importées, {vertex_count} sommets, 23 os KayKit')
    print('✓ Visage KayKit, jambes Ranger gauche/droite et chaussures conservés')
    print('! À valider : raccord taille/torse, épaules et déformation des bras en mouvement')
    return report


if __name__ == '__main__':
    build(*(Path(p) for p in sys.argv[1:]))
