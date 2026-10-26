import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { addDaylight, configureRenderer, studioBackground } from './rendering/Lighting';
import { makeGardeningSpade } from './gardeningSpade';

type KayKitManifest = {
  version: string;
  model: string;
  sets: string[];
  clips: Record<string, string>;
};
type Motion = 'Idle_A' | 'Walking_A' | 'Running_A' | 'Dig' | 'Digging' | 'Working_A';
const MOTIONS: { key: Motion; label: string; loop: boolean }[] = [
  { key: 'Idle_A', label: 'Attente', loop: true },
  { key: 'Walking_A', label: 'Marche', loop: true },
  { key: 'Running_A', label: 'Course', loop: true },
  { key: 'Dig', label: 'Coup de pelle', loop: false },
  { key: 'Digging', label: 'Creuser', loop: true },
  { key: 'Working_A', label: 'Travailler', loop: true },
];
const norm = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const loader = new GLTFLoader();
const loadGLTF = (url: string) => loader.loadAsync(url);

/** No bespoke rig: bind the original Rig_Medium animation channels by bone name. */
function bindClip(clip: THREE.AnimationClip, bones: Map<string, THREE.Bone>) {
  let skipped = 0;
  const tracks: THREE.KeyframeTrack[] = [];
  for (const original of clip.tracks) {
    const separator = original.name.lastIndexOf('.');
    if (separator < 0) { skipped++; continue; }
    const source = original.name.slice(0, separator).split('/').pop()!;
    const property = original.name.slice(separator + 1);
    if (!['quaternion', 'position', 'scale'].includes(property)) { skipped++; continue; }
    const target = [source, source.split('|').pop()!, source.split(':').pop()!]
      .map(name => bones.get(norm(name))).find(Boolean);
    if (!target) { skipped++; continue; }
    const track = original.clone();
    track.name = `${target.name}.${property}`;
    tracks.push(track);
  }
  return { clip: new THREE.AnimationClip(clip.name, clip.duration, tracks), skipped, matched: tracks.length };
}

/** Visual studio for the unmodified, animated KayKit base.
 * Garments must be fitted to the real source mesh (Blender and skin weights),
 * not painted as bounding-box primitives over an RPG character.
 */
export function openKaykitLab() {
  if (document.querySelector('#kaykit-lab')) return;
  const root = document.createElement('section');
  root.id = 'kaykit-lab';
  root.innerHTML = `
    <header class="kkl-top"><div><small>KOMOREBI / V0.47 · KAYKIT</small><h2>Atelier du jardinier</h2></div>
    <button data-close type="button">✕ Fermer</button></header>
    <div class="kkl-stage"></div>
    <footer class="kkl-bottom">
      <div class="kkl-buttons" data-animations></div>
      <div class="kkl-row"><button data-character-compare type="button">Comparer avec notre ancien jardinier ↗</button><button data-variant type="button">Comparer : Ranger original</button><button data-pause>Pause</button><label>Pose <input data-scrub type="range" min="0" max="100" value="0"></label>
      <label>Vitesse <input data-speed type="range" min="0.2" max="1.5" step="0.1" value="0.8"></label>
      <label>Angle pelle <input data-spade-pitch type="range" min="-90" max="90" step="5" value="0"></label>
      <button data-angle>Vue : 3/4</button></div>
      <small data-status>Chargement des assets…</small>
      <small>Jardinier V0.47 : bras simplifiés · Sourcils adoucis · Pelle liée à la main · Comparaison Ranger.</small>
      <small>Tourner : glisser · Zoom : molette · Comparer la silhouette et vérifier les mains/pieds</small>
    </footer>`;
  document.body.append(root);

  const css = document.createElement('style');
  css.textContent = `
  #kaykit-lab{position:fixed;z-index:250;inset:0;display:flex;flex-direction:column;color:#302f28;background:#e9e8dc;font-family:system-ui,sans-serif}
  #kaykit-lab *{box-sizing:border-box}
  #kaykit-lab button{cursor:pointer;padding:9px 13px;border:1px solid #aaa99e;background:#f9f7ee;border-radius:7px;color:#34372f}
  #kaykit-lab button.active{background:#4f7261;color:white;border-color:#4f7261}
  .kkl-top{padding:14px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #bcbcb0}
  .kkl-top h2{margin:3px 0;font-size:22px}.kkl-top small{font-size:11px;letter-spacing:.15em}
  .kkl-stage{flex:1;min-height:0;position:relative}.kkl-stage canvas{width:100%;height:100%;display:block;touch-action:none}
  .kkl-bottom{padding:12px 20px 14px;display:grid;gap:9px;background:#f4f2e8;border-top:1px solid #bcbcb0}
  .kkl-buttons,.kkl-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.kkl-row label{display:flex;align-items:center;gap:8px}
  .kkl-row input{accent-color:#567b65}.kkl-bottom small{font-size:12px;color:#67695c}
  [data-status].error{color:#9f3830!important;font-weight:650}
  `;
  document.head.append(css);
  const host = root.querySelector<HTMLElement>('.kkl-stage')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  configureRenderer(renderer);
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(studioBackground);
  addDaylight(scene, true);
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.68, .18, 48), new THREE.MeshStandardMaterial({ color: 0xa2b477, roughness: 1 }));
  ground.position.y = -.10;
  ground.receiveShadow = true;
  scene.add(ground);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  let yaw = .65, pitch = .25, distance = 5.6;
  const updateCamera = () => {
    const h = Math.cos(pitch) * distance;
    camera.position.set(Math.sin(yaw) * h, 1 + Math.sin(pitch) * distance, Math.cos(yaw) * h);
    camera.lookAt(0, 1, 0);
  };
  updateCamera();
  let alive = true, phase = 0, last = performance.now(), running = true, speed = .8;
  let model: THREE.Group | undefined;
  let mixer: THREE.AnimationMixer | undefined;
  let variants: { gardener: THREE.Group; original: THREE.Group } | undefined;
  let variant: 'gardener' | 'original' = 'gardener';
  const variantButton = root.querySelector<HTMLButtonElement>('#kaykit-lab button[data-variant]')!;
  root.querySelector<HTMLButtonElement>('[data-character-compare]')!.onclick = () => {
    void import('./characterCompare').then(m => m.openCharacterCompare());
  };
  const toolsByVariant = new Map<'gardener' | 'original', THREE.Group>();
  let spadePitch = 0;
  const updateSpade = () => {
    for (const spade of toolsByVariant.values()) {
      spade.rotation.x = THREE.MathUtils.degToRad(spadePitch);
      spade.visible = active === 'Dig' || active === 'Digging';
    }
  };
  let active: Motion = 'Idle_A';
  let current: THREE.AnimationAction | undefined;
  const motions = new Map<Motion, THREE.AnimationClip>();
  const actions = root.querySelector<HTMLElement>('[data-animations]')!;
  const pause = root.querySelector<HTMLButtonElement>('[data-pause]')!;
  const scrub = root.querySelector<HTMLInputElement>('[data-scrub]')!;
  const report = (value: string, error = false) => { status.textContent = value; status.classList.toggle('error', error); };

  function pose(t: number) {
    phase = THREE.MathUtils.clamp(t, 0, 1);
    scrub.value = String(Math.round(phase * 100));
    updateSpade();
    const clip = motions.get(active);
    if (!clip || !mixer) return;
    const action = mixer.clipAction(clip);
    if (current !== action) {
      mixer.stopAllAction();
      current = action;
      current.reset().play();
    }
    mixer.setTime(Math.min(phase, .99999) * clip.duration);
    mixer.update(0);
  }
  function choose(key: Motion) {
    active = key;
    current = undefined;
    actions.querySelectorAll<HTMLButtonElement>('[data-motion]').forEach(b => b.classList.toggle('active', b.dataset.motion === key));
    pose(0);
  }
  const angle = root.querySelector<HTMLButtonElement>('[data-angle]')!;
  angle.onclick = () => { yaw = Math.abs(yaw - .65) < .05 ? 0 : Math.abs(yaw) < .05 ? Math.PI / 2 : .65; angle.textContent = `Vue : ${Math.abs(yaw - .65) < .05 ? '3/4' : Math.abs(yaw) < .05 ? 'Face' : 'Profil'}`; updateCamera(); };
  variantButton.onclick = () => {
    if (!variants || !model) return;
    model.visible = false;
    mixer?.stopAllAction();
    variant = variant === 'gardener' ? 'original' : 'gardener';
    model = variants[variant];
    model.visible = true;
    root.dataset.variant = variant;
    mixer = new THREE.AnimationMixer(model);
    current = undefined;
    pose(phase);
    variantButton.textContent = variant === 'gardener' ? 'Comparer : Ranger original' : 'Revenir au jardinier';
    report(`Affichage : ${variant === 'gardener' ? 'jardinier V0.47' : 'Ranger KayKit original'} · animations sur Rig_Medium`);
  };
  pause.onclick = () => { running = !running; pause.textContent = running ? 'Pause' : 'Lecture'; };
  scrub.oninput = () => { running = false; pause.textContent = 'Lecture'; pose(Number(scrub.value) / 100); };
  root.querySelector<HTMLInputElement>('[data-speed]')!.oninput = e => { speed = Number((e.target as HTMLInputElement).value); };
  root.querySelector<HTMLInputElement>('[data-spade-pitch]')!.oninput = e => {
    spadePitch = Number((e.target as HTMLInputElement).value);
    updateSpade();
  };
  const canvas = renderer.domElement;
  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; yaw -= (e.clientX - lastX) * .008; pitch = THREE.MathUtils.clamp(pitch + (e.clientY - lastY) * .005, -.15, 1); lastX = e.clientX; lastY = e.clientY; updateCamera(); });
  canvas.addEventListener('wheel', e => { e.preventDefault(); distance = THREE.MathUtils.clamp(distance * (e.deltaY > 0 ? 1.1 : .9), 3.5, 10); updateCamera(); }, { passive: false });
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (w < 2 || h < 2) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();

  async function init() {
    try {
      const response = await fetch('/assets/kaykit-v045/manifest.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Assets non installés. Consulte docs/V045_KAYKIT.md.');
      const manifest = await response.json() as KayKitManifest;
      const original = await loadGLTF(manifest.model);
      const dressed = await loadGLTF('/assets/kaykit-v045/gardener-v047.glb');
      if (!alive) return;
      variants = { original: original.scene, gardener: dressed.scene };
      model = variants.gardener;
      // Both variants use exactly the same normalized rig origin and scaling.
      for (const candidate of Object.values(variants)) {
        candidate.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
      }
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      if (size.y < .1) throw new Error('Modèle KayKit sans géométrie exploitable.');
      // Uniform transform: the dress shares original Ranger bind pose and bones.
      for (const candidate of Object.values(variants)) {
        candidate.scale.multiplyScalar(1.85 / size.y);
        const scaled = new THREE.Box3().setFromObject(candidate);
        candidate.position.set(-scaled.getCenter(new THREE.Vector3()).x, -scaled.min.y, -scaled.getCenter(new THREE.Vector3()).z);
        candidate.visible = candidate === model;
        scene.add(candidate);
      }
      for (const [key, candidate] of Object.entries(variants) as Array<['gardener' | 'original', THREE.Group]>) {
        let hand: THREE.Bone | undefined;
        candidate.traverse(n => { if (n instanceof THREE.Bone && norm(n.name) === 'handslotr') hand = n; });
        if (!hand) throw new Error(`Os handslot.r introuvable sur ${key} : impossible d'attacher la pelle.`);
        const spade = makeGardeningSpade();
        hand.add(spade);
        toolsByVariant.set(key, spade);
      }
      updateSpade();
      const bones = new Map<string, THREE.Bone>();
      model.traverse(n => { if (n instanceof THREE.Bone) bones.set(norm(n.name), n); });
      if (bones.size < 10) throw new Error(`Rig incomplet : ${bones.size} os. Il faut le modèle Adventurers FREE 2.0.`);
      mixer = new THREE.AnimationMixer(model);
      const sourceSets = await Promise.all(manifest.sets.map(loadGLTF));
      if (!alive) return;
      const diagnostics: string[] = [];
      for (const motion of MOTIONS) {
        const originalName = manifest.clips[motion.key];
        if (!originalName) continue;
        const source = sourceSets.flatMap(s => s.animations).find(c => c.name === originalName);
        if (!source) { diagnostics.push(`${motion.key} absent du GLB`); continue; }
        const mapped = bindClip(source, bones);
        if (mapped.matched < 8) { diagnostics.push(`${motion.key}: ${mapped.matched} pistes seulement`); continue; }
        motions.set(motion.key, mapped.clip);
        const button = document.createElement('button');
        button.type = 'button'; button.dataset.motion = motion.key; button.textContent = motion.label;
        button.onclick = () => choose(motion.key);
        actions.append(button);
      }
      if (!motions.has('Idle_A') || !motions.has('Walking_A') || !motions.has('Digging')) {
        throw new Error('Clips insuffisants : ' + diagnostics.join(', ') + '. Voir les fichiers importés.');
      }
      root.dataset.variant = 'gardener';
      choose('Idle_A');
      const meshes: Array<Record<string, unknown>> = [];
      model.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        const bounds = new THREE.Box3().setFromObject(node);
        const materialNames = (Array.isArray(node.material) ? node.material : [node.material]).map(mat => mat.name || '(sans nom)');
        meshes.push({
          name: node.name,
          type: node instanceof THREE.SkinnedMesh ? 'SkinnedMesh' : 'Mesh',
          materials: materialNames,
          min: bounds.min.toArray().map(v => +v.toFixed(4)),
          max: bounds.max.toArray().map(v => +v.toFixed(4)),
        });
      });
      // Playwright reads this diagnostic to help determine how the real meshes
      // should be dressed in Blender; do not include private local filenames.
      Object.assign(root, { kaykitDiagnostics: {
        model: manifest.model.split('/').pop(),
        gardener: 'gardener-v047.glb',
        spadeBone: 'handslot.r',
        spadeAngle: spadePitch,
        comparison: true,
        bones: [...bones.values()].map(b => b.name),
        meshes,
        animations: [...motions.keys()],
      }});
      report(`Jardinier V0.47 : ${bones.size} os KayKit · ${motions.size} animations · tenue réelle (GLB)${diagnostics.length ? ' · ' + diagnostics.join('; ') : ''}`);
      root.dataset.ready = 'true';
    } catch (err) {
      report(`V0.46 : ${err instanceof Error ? err.message : String(err)}`, true);
      console.error('KayKit atelier:', err);
    }
  }
  void init();
  let frame = 0;
  const loop = (now: number) => {
    if (!alive) return;
    frame = requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const clip = motions.get(active);
    if (running && clip) {
      let next = phase + dt * speed / Math.max(.001, clip.duration);
      if (next >= 1) {
        const loopable = MOTIONS.find(m => m.key === active)?.loop;
        next = loopable ? next % 1 : 1;
        if (!loopable) { running = false; pause.textContent = 'Lecture'; }
      }
      pose(next);
    }
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(loop);
  root.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => {
    alive = false;
    cancelAnimationFrame(frame);
    observer.disconnect();
    mixer?.stopAllAction();
    scene.traverse(o => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    renderer.dispose();
    css.remove();
    root.remove();
  };
}
