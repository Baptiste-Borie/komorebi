#!/usr/bin/env python3
"""Import the *official free* KayKit archives into Komorebi's local preview.

Usage: python3 scripts/import_kaykit_v045.py ~/Downloads/Adventurers-Free.zip ~/Downloads/Character-Animations-Free.zip
No third-party Python packages or Blender required. The original archives are never modified.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import struct
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'public' / 'assets' / 'kaykit-v045'
REQUIRED = ('Idle_A', 'Walking_A', 'Dig', 'Digging')
OPTIONAL = ('Running_A', 'Working_A', 'Work_A', 'Holding_A')


def norm(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', s.lower())


def unpack(src: Path, dest: Path) -> Path:
    if src.is_dir():
        return src
    if not zipfile.is_zipfile(src):
        raise RuntimeError(f'Archive ZIP introuvable/invalide: {src}')
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(src) as z:
        for info in z.infolist():
            path = Path(info.filename)
            if path.is_absolute() or '..' in path.parts:
                raise RuntimeError(f'Chemin ZIP non sûr : {info.filename}')
            # Reject archive symlinks too.
            if ((info.external_attr >> 16) & 0o170000) == 0o120000:
                raise RuntimeError(f'Lien symbolique ZIP refusé : {info.filename}')
        z.extractall(dest)
    return dest


def candidates(root: Path):
    return sorted((p for p in root.rglob('*') if p.suffix.lower() in ('.glb', '.gltf')),
                  key=lambda p: str(p).lower())


def gltf_json(path: Path) -> dict:
    if path.suffix.lower() == '.gltf':
        return json.loads(path.read_text(encoding='utf-8-sig'))
    with path.open('rb') as f:
        head = f.read(20)
        if len(head) != 20 or head[:4] != b'glTF' or struct.unpack_from('<I', head, 4)[0] != 2:
            raise ValueError(f'GLB 2.0 invalide : {path}')
        length, chunk_type = struct.unpack_from('<II', head, 12)
        if chunk_type != 0x4E4F534A:  # JSON
            raise ValueError(f'JSON chunk GLB manquant : {path}')
        return json.loads(f.read(length).decode('utf-8'))


def clip_names(path: Path) -> list[str]:
    try:
        return [a.get('name', '') for a in gltf_json(path).get('animations', [])]
    except (OSError, ValueError, json.JSONDecodeError):
        return []


def copy_gltf(source: Path, root: Path, target: Path) -> Path:
    """Preserve relative .bin/texture paths referenced in a glTF, no full archive copy."""
    relative = source.relative_to(root)
    dst = target / relative
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dst)
    if source.suffix.lower() == '.gltf':
        document = gltf_json(source)
        uris = [x.get('uri') for typ in ('buffers', 'images') for x in document.get(typ, [])]
        for uri in uris:
            if not uri or uri.startswith('data:'):
                continue
            parsed = urlsplit(uri)
            if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment:
                raise RuntimeError(f'URI glTF externe non autorisée : {uri}')
            rel = Path(unquote(parsed.path))
            dep = (source.parent / rel).resolve()
            if not dep.is_relative_to(root.resolve()) or not dep.is_file():
                raise RuntimeError(f'Dépendance glTF manquante/hors archive : {uri}')
            out_dep = target / dep.relative_to(root)
            out_dep.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(dep, out_dep)
    return dst


def choose_model(root: Path) -> Path:
    models = []
    for p in candidates(root):
        stem = norm(p.stem)
        if stem not in ('ranger', 'rogue', 'mage', 'knight', 'barbarian'):
            continue
        score = {'ranger': 0, 'rogue': 1, 'mage': 2, 'knight': 3, 'barbarian': 4}[stem]
        models.append((score, 0 if p.suffix.lower() == '.glb' else 1, len(str(p)), p))
    if not models:
        raise RuntimeError('Aucun Ranger/Rogue/Mage/Knight trouvé en glTF/GLB. Vérifie que tu as téléchargé Adventurers FREE 2.0.')
    return min(models)[3]


def choose_animation_sets(root: Path) -> tuple[list[Path], dict[str, str]]:
    found = []
    for p in candidates(root):
        path = str(p).lower()
        if 'large' in path or 'skeleton' in path:
            continue
        clips = clip_names(p)
        if not clips:
            continue
        names = {norm(s): s for s in clips if s}
        covers = sum(norm(wanted) in names for wanted in REQUIRED + OPTIONAL)
        if covers:
            # Rig_Medium is the target; prefer .glb where both are available.
            found.append((p, names, covers))
    needed = {norm(w) for w in REQUIRED + OPTIONAL}
    selected = []
    matched = {}
    while needed:
        best = None
        for p, names, _ in found:
            if p in selected:
                continue
            hit = needed.intersection(names)
            if not hit:
                continue
            rank = (len(hit), 'medium' in str(p).lower(), p.suffix.lower() == '.glb')
            if best is None or rank > best[0]:
                best = (rank, p, names)
        if best is None:
            break
        _, p, names = best
        selected.append(p)
        for wanted in list(needed.intersection(names)):
            matched[next((n for n in REQUIRED + OPTIONAL if norm(n) == wanted))] = names[wanted]
        needed.difference_update(names)
    missing = [name for name in REQUIRED if name not in matched]
    if missing:
        raise RuntimeError('Animations KayKit manquantes : ' + ', '.join(missing) + '. Télécharge la version FREE 1.1 (avec Tools), pas une ancienne archive.')
    return selected, matched


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('characters', type=Path, help='ZIP ou dossier Adventurers Free 2.0')
    parser.add_argument('animations', type=Path, help='ZIP ou dossier Character Animations Free 1.1')
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='komorebi-kaykit-') as tmp:
        base = Path(tmp)
        characters = unpack(args.characters.expanduser().resolve(), base / 'characters')
        animations = unpack(args.animations.expanduser().resolve(), base / 'animations')
        model = choose_model(characters)
        sets, names = choose_animation_sets(animations)
        # Make the final manifest visible only after every dependency is installed.
        out_tmp = OUTPUT.parent / (OUTPUT.name + '-staging')
        if out_tmp.exists():
            shutil.rmtree(out_tmp)
        out_tmp.mkdir(parents=True)
        try:
            final_model = copy_gltf(model, characters, out_tmp / 'character')
            final_sets = [copy_gltf(p, animations, out_tmp / 'animations') for p in sets]
            manifest = {
                'version': '0.45',
                'author': 'Kay Lousberg / KayKit',
                'license': 'CC0 1.0',
                'model': '/assets/kaykit-v045/' + final_model.relative_to(out_tmp).as_posix(),
                'sets': ['/assets/kaykit-v045/' + p.relative_to(out_tmp).as_posix() for p in final_sets],
                'clips': names,
            }
            (out_tmp / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf8')
            if OUTPUT.exists():
                shutil.rmtree(OUTPUT)
            out_tmp.replace(OUTPUT)
        finally:
            if out_tmp.exists():
                shutil.rmtree(out_tmp)
    print('KayKit V0.45 importé :', OUTPUT)
    print('Modèle :', model.name, '| groupes :', len(sets))
    print('Clips :', ', '.join(names))
    print('Ouvrir : http://localhost:5173/?kaykit=1 (npm run dev)')


if __name__ == '__main__':
    main()
