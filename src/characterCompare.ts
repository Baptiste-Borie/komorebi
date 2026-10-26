import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { addDaylight, configureRenderer, studioBackground } from './rendering/Lighting';

type Origin = 'old' | 'new';
type Region = 'face' | 'mouth' | 'eyes' | 'hair' | 'torso' | 'arms' | 'legs' | 'boots' | 'hat';
type Choice = { source: Origin; note: string };
type SelectedMesh = { model: Origin; name: string; materials: string[] };

const REGIONS: { id: Region; name: string; source: Origin; hint: string }[] = [
  { id: 'face', name: 'Forme du visage', source: 'new', hint: 'Garder les volumes du nouveau visage.' },
  { id: 'mouth', name: 'Bouche', source: 'new', hint: 'La bouche du nouveau fonctionne mieux.' },
  { id: 'eyes', name: 'Yeux et sourcils', source: 'new', hint: 'Yeux du nouveau ; ajuster seulement si besoin.' },
  { id: 'hair', name: 'Cheveux', source: 'old', hint: 'Reprendre la coiffure de l’ancien jardinier.' },
  { id: 'torso', name: 'Buste, tenue et salopette', source: 'old', hint: 'Garder l’apparence générale de l’ancien jardinier.' },
  { id: 'arms', name: 'Bras et mains', source: 'old', hint: 'Style ancien, épaules naturelles et véritables articulations coude/poignet KayKit. Pas de couches RPG.' },
  { id: 'legs', name: 'Jambes et pantalon', source: 'new', hint: 'Reprendre exactement Ranger_LegLeft et Ranger_LegRight (forme et épaisseur).'} ,
  { id: 'boots', name: 'Chaussures', source: 'new', hint: 'Reprendre les chaussures du nouveau.' },
  { id: 'hat', name: 'Chapeau et accessoires', source: 'old', hint: 'Reprendre le chapeau de l’ancien jardinier.' },
];
const STORAGE = 'komorebi-character-compare-v2'; // New defaults from confirmed 26 Oct feedback; old draft choices are not silently reused.
const gltfLoader = new GLTFLoader();

function initialChoices(): Record<Region, Choice> {
  const result = {} as Record<Region, Choice>;
  for (const item of REGIONS) result[item.id] = { source: item.source, note: item.hint };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null');
    if (saved && typeof saved === 'object') for (const item of REGIONS) {
      const row = saved[item.id];
      if (row && (row.source === 'old' || row.source === 'new')) {
        result[item.id] = { source: row.source, note: typeof row.note === 'string' ? row.note : '' };
      }
    }
  } catch { /* Invalid saved preferences must not block the studio. */ }
  return result;
}

/** Visual comparison ONLY. The old Blender rig and KayKit Rig_Medium are incompatible;
 * choosing a reference part here never swaps skinned meshes between skeletons.
 * The report is a modeling brief to apply with Blender and proper weight transfer.
 */
export function openCharacterCompare() {
  if (document.querySelector('#character-compare')) return;
  const choices = initialChoices();
  let selected: SelectedMesh | null = null;
  const root = document.createElement('section');
  root.id = 'character-compare';
  root.innerHTML = `
    <header class="cc-head"><div><small>KOMOREBI / PERSONNAGES / COMPARAISON</small><h2>Comparer les références</h2></div>
      <button data-close type="button">← Retour aux ateliers</button></header>
    <main class="cc-layout">
      <div class="cc-view">
        <div class="cc-names"><span>NOTRE ANCIEN JARDINIER · V0.44</span><span>PREMIER HYBRIDE · V0.51</span></div>
        <div class="cc-canvas"></div>
        <div class="cc-camera">
          <button data-view="front">Face</button><button data-view="three-quarter" class="active">3/4</button>
          <button data-view="side">Profil</button><button data-view="back">Dos</button>
          <span>Glisser : tourner les deux · Molette : zoomer · Cliquer : inspecter une pièce</span>
        </div>
      </div>
      <aside class="cc-panel">
        <div class="cc-intro"><strong>Le prototype hybride est maintenant modélisé.</strong>
          <p>À gauche l’ancien V0.44, à droite le nouvel hybride V0.51 : compare leurs raccords et leurs silhouettes.</p>
          <p>Tes choix enregistrent des corrections à effectuer : ils ne changent pas instantanément la géométrie.</p>
        </div>
        <div class="cc-review-state"><strong>V0.51 modélisée :</strong> visage KayKit, tenue V0.44, articulations KayKit, jambes et bottes Ranger. <strong>À valider visuellement.</strong></div>
        <div class="cc-tabs" aria-label="Parties à comparer"><button type="button" data-group-tab="face" class="active">Visage</button><button type="button" data-group-tab="body">Corps</button><button type="button" data-group-tab="legs">Jambes</button></div>
        <div class="cc-choices"></div>
        <div class="cc-inspector"><strong>Pièce sélectionnée</strong><div data-mesh> Clique sur le personnage pour identifier son maillage.</div></div>
        <label class="cc-summary">Avis général
          <textarea data-summary rows="3" placeholder="Autres corrections, silhouette, superpositions, impression générale…"></textarea>
        </label>
        <button data-export class="cc-export" type="button">Exporter mes choix + capture (.json)</button>
        <small class="cc-status" data-status>Chargement des deux modèles…</small>
      </aside>
    </main>`;
  document.body.append(root);

  const css = document.createElement('style');
  css.textContent = `
  #character-compare{position:fixed;inset:0;z-index:300;display:flex;flex-direction:column;background:#eeeDE4;color:#2c332e;font:14px system-ui,sans-serif}
  #character-compare *{box-sizing:border-box}
  #character-compare button{cursor:pointer;border:1px solid #bbbdb2;background:#fffdf6;border-radius:7px;padding:9px 12px;color:#28382f;font:inherit}
  #character-compare button:hover{background:#e1eadb}#character-compare button.active{background:#4d725a;color:white;border-color:#4d725a}
  #character-compare h2{font-size:21px;margin:2px 0}#character-compare small{color:#687065}
  .cc-head{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid #c7c8bb;background:#f8f7f0}
  .cc-head small{letter-spacing:.12em;font-size:10px}.cc-layout{display:grid;grid-template-columns:minmax(0,1fr) 355px;flex:1;min-height:0}
  .cc-view{min-height:0;display:flex;flex-direction:column;position:relative}.cc-canvas{flex:1;min-height:0}
  .cc-canvas canvas{width:100%;height:100%;display:block;touch-action:none}.cc-names{position:absolute;z-index:1;left:0;right:0;top:16px;display:flex;pointer-events:none}
  .cc-names span{width:50%;text-align:center;font-size:12px;font-weight:700;letter-spacing:.08em}
  .cc-camera{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:7px;padding:10px;background:#faf9f2;border-top:1px solid #c7c8bb}
  .cc-camera span{font-size:11px;color:#697369}.cc-panel{overflow-y:auto;min-height:0;border-left:1px solid #c7c8bb;padding:14px;background:#f8f7f0;display:flex;flex-direction:column;gap:12px}
  .cc-intro{padding:12px;background:#e7ece3;border-radius:9px}.cc-intro p{font-size:12px;line-height:1.45;margin:7px 0 0}
  .cc-choices{display:grid;gap:10px}.cc-region{padding:10px;border:1px solid #d5d7cc;background:white;border-radius:9px}
  .cc-region>strong{display:block;font-size:13px;margin-bottom:8px}.cc-region-switch{display:flex;gap:6px;margin-bottom:6px}
  .cc-region-switch button{flex:1;padding:6px!important;font-size:12px!important}.cc-region textarea,.cc-summary textarea{resize:vertical;width:100%;padding:8px;border:1px solid #d0d3c7;border-radius:5px;font:12px system-ui}
  .cc-summary{font-weight:650;display:grid;gap:6px}.cc-inspector{display:grid;gap:4px;background:#edece4;padding:10px;border-radius:7px}
  .cc-inspector [data-mesh]{font-size:12px;overflow-wrap:anywhere}.cc-export{background:#3f6650!important;color:white!important;font-weight:700!important}
  .cc-status{display:block;padding-bottom:10px;line-height:1.4}@media(max-width:900px){.cc-layout{grid-template-columns:minmax(0,1fr) 285px}.cc-names span{font-size:10px}}
  `;
  document.head.append(css);
  const host = root.querySelector<HTMLElement>('.cc-canvas')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  const rows = root.querySelector<HTMLElement>('.cc-choices')!;
  const textSummary = root.querySelector<HTMLTextAreaElement>('[data-summary]')!;
  const persist = () => localStorage.setItem(STORAGE, JSON.stringify(choices));
  const grouped: Record<Region, 'face' | 'body' | 'legs'> = {
    face: 'face', mouth: 'face', eyes: 'face', hair: 'face', hat: 'face',
    torso: 'body', arms: 'body', legs: 'legs', boots: 'legs',
  };
  const safe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  for (const item of REGIONS) {
    const el = document.createElement('section');
    el.className = 'cc-region';
    el.dataset.group = grouped[item.id];
    el.innerHTML = `<strong>${safe(item.name)}</strong><div class="cc-region-switch">
      <button type="button" data-source="old">V0.44</button><button type="button" data-source="new">V0.51</button></div>
      <textarea rows="2" aria-label="Remarques : ${safe(item.name)}" placeholder="Ce qui doit changer…"></textarea>`;
    const buttons = el.querySelectorAll<HTMLButtonElement>('[data-source]');
    const sync = () => buttons.forEach(b => { const active = b.dataset.source === choices[item.id].source; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
    buttons.forEach(b => b.addEventListener('click', () => { choices[item.id].source = b.dataset.source as Origin; sync(); persist(); }));
    const input = el.querySelector('textarea')!;
    input.value = choices[item.id].note;
    input.addEventListener('input', () => { choices[item.id].note = input.value; persist(); });
    sync(); rows.append(el);
  }
  const changeGroup = (group: string) => {
    rows.querySelectorAll<HTMLElement>('.cc-region').forEach(item => { item.hidden = item.dataset.group !== group; });
    root.querySelectorAll<HTMLButtonElement>('[data-group-tab]').forEach(button => {
      const isActive = button.dataset.groupTab === group;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  };
  root.querySelectorAll<HTMLButtonElement>('[data-group-tab]').forEach(button => button.onclick = () => changeGroup(button.dataset.groupTab || 'face'));
  changeGroup('face');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  configureRenderer(renderer);
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(studioBackground);
  addDaylight(scene, true);
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 70);
  const roots = {} as Record<Origin, THREE.Group>;
  const holders = {} as Record<Origin, THREE.Group>;
  let yaw = .64, pitch = .23, distance = 7.25;
  const updateCamera = () => {
    // Rotate each model around its own center: the left/right labels never swap.
    // Both characters are observed at the same angle under identical lighting.
    for (const holder of Object.values(holders)) holder.rotation.y = yaw;
    camera.position.set(0, 1 + Math.sin(pitch) * distance, Math.cos(pitch) * distance);
    camera.lookAt(0, .98, 0);
  };
  updateCamera();
  let highlighter: THREE.BoxHelper | null = null;
  let alive = true, loaded = false;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const canvas = renderer.domElement;
  function pick(event: PointerEvent) {
    if (!loaded) return;
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([roots.old, roots.new], true)
      .filter(h => h.object instanceof THREE.Mesh && h.object.userData.comparisonGround !== true);
    if (!hits.length) return;
    const node = hits[0].object as THREE.Mesh;
    const from: Origin = (() => { let p: THREE.Object3D | null = node; while (p) { if (p === roots.old) return 'old'; if (p === roots.new) return 'new'; p = p.parent; } return 'new'; })();
    const materials = (Array.isArray(node.material) ? node.material : [node.material]).map(m => m.name || '(sans nom)');
    selected = { model: from, name: node.name || node.parent?.name || '(maillage sans nom)', materials };
    root.querySelector<HTMLElement>('[data-mesh]')!.textContent = `${from === 'old' ? 'Ancien' : 'Nouveau'} · ${selected.name} · ${materials.join(', ')}`;
    if (highlighter) { scene.remove(highlighter); highlighter.geometry.dispose(); }
    highlighter = new THREE.BoxHelper(node, 0xd49b40);
    scene.add(highlighter);
  }
  let isDragging = false, moved = false, lastX = 0, lastY = 0;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', e => { isDragging = true; moved = false; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', e => { if (isDragging && !moved) pick(e); isDragging = false; });
  canvas.addEventListener('pointercancel', () => { isDragging = false; });
  canvas.addEventListener('pointermove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    yaw -= dx * .008; pitch = THREE.MathUtils.clamp(pitch + dy * .006, -.30, 1.1);
    lastX = e.clientX; lastY = e.clientY; updateCamera();
  });
  canvas.addEventListener('wheel', e => { e.preventDefault(); distance = THREE.MathUtils.clamp(distance * (e.deltaY > 0 ? 1.08 : .92), 4.2, 13); updateCamera(); }, { passive: false });
  const angles = { front: 0, 'three-quarter': .64, side: Math.PI / 2, back: Math.PI };
  root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.onclick = () => {
    yaw = angles[b.dataset.view as keyof typeof angles]; pitch = .18; updateCamera();
    root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(item => item.classList.toggle('active', item === b));
  });
  const resize = () => { if (!alive) return; const w = host.clientWidth, h = host.clientHeight; if (w < 2 || h < 2) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();

  void (async () => {
    try {
      const [older, newer] = await Promise.all([
        gltfLoader.loadAsync('/assets/gardener-v044.glb'),
        gltfLoader.loadAsync('/assets/kaykit-v045/gardener-v051.glb'),
      ]);
      if (!alive) return;
      roots.old = older.scene; roots.new = newer.scene;
      for (const [key, obj] of Object.entries(roots) as Array<[Origin, THREE.Group]>) {
        const box = new THREE.Box3().setFromObject(obj);
        const height = box.getSize(new THREE.Vector3()).y;
        if (!Number.isFinite(height) || height < .1) throw new Error(`Modèle ${key} sans géométrie.`);
        obj.scale.multiplyScalar(1.85 / height);
        const normalized = new THREE.Box3().setFromObject(obj);
        const center = normalized.getCenter(new THREE.Vector3());
        obj.position.set(-center.x, -.02 - normalized.min.y, -center.z);
        obj.traverse(n => { if (n instanceof THREE.Mesh) { n.castShadow = true; n.receiveShadow = true; } });
        const holder = new THREE.Group();
        holder.position.x = key === 'old' ? -1.30 : 1.30;
        holder.rotation.y = yaw;
        holder.add(obj);
        holders[key] = holder;
        scene.add(holder);
        const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.04, 1.09, .14, 48),
          new THREE.MeshStandardMaterial({ color: 0x9fb379, roughness: 1 }));
        pedestal.position.set(key === 'old' ? -1.30 : 1.30, -.11, 0);
        pedestal.receiveShadow = true; pedestal.userData.comparisonGround = true;
        scene.add(pedestal);
      }
      loaded = true;
      status.textContent = 'Modèle hybride V0.51 chargé · inspecte les bras, le visage et les raccords.';
      root.dataset.ready = 'true';
    } catch (err) {
      status.textContent = `Impossible de charger les modèles : ${err instanceof Error ? err.message : String(err)}`;
      status.style.color = '#a43a30';
      console.error('Komorebi : atelier comparatif', err);
    }
  })();
  root.querySelector<HTMLButtonElement>('[data-export]')!.onclick = () => {
    if (!loaded) { status.textContent = 'Les modèles doivent être chargés avant export.'; return; }
    renderer.render(scene, camera);
    const payload = {
      type: 'komorebi-character-review', version: 1,
      createdAt: new Date().toISOString(),
      status: 'propositions_non_validees',
      reference: { old: 'gardener-v044.glb', new: 'gardener-v051.glb' },
      rigNote: 'Références esthétiques seulement : les deux rigs ne sont pas interchangeables.',
      selections: choices,
      comment: textSummary.value,
      clickedMesh: selected,
      camera: { yaw, elevation: pitch, distance },
      image: canvas.toDataURL('image/png'),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `komorebi-character-feedback-${Date.now()}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    status.textContent = 'Avis exporté avec la capture. Envoie-moi le fichier JSON pour préparer le mélange, sans validation automatique.';
  };
  let frame = 0;
  const loop = () => { if (!alive) return; frame = requestAnimationFrame(loop); renderer.render(scene, camera); };
  frame = requestAnimationFrame(loop);
  root.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => {
    alive = false; cancelAnimationFrame(frame); observer.disconnect();
    highlighter?.geometry.dispose();
    // GLB geometry is owned by this viewer; the other character lab loads its own copies.
    for (const obj of Object.values(roots)) obj.traverse(n => { if (n instanceof THREE.Mesh) n.geometry.dispose(); });
    renderer.dispose(); css.remove(); root.remove();
    if (!document.querySelector('#kaykit-lab')) window.dispatchEvent(new Event('komorebi:workspace-open'));
  };
}
