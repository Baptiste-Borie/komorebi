import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { configureRenderer, addDaylight, studioBackground } from './rendering/Lighting';

/** V0.40: polished static KayKit-derived gardener; inspect the Blender model before touching rigging or Earthworks. */
export function openCharacterLab() {
  if (document.querySelector('#character-lab')) return;
  const root = document.createElement('section');
  root.id = 'character-lab';
  root.innerHTML = `
    <header class="character-lab-top">
      <div><small>KOMOREBI · ÉTUDE DE PERSONNAGE 01</small><h2>Notre petit jardinier</h2></div>
      <button id="character-lab-close" type="button">✕ Retour à Earthworks</button>
    </header>
    <div class="character-lab-stage"></div>
    <footer class="character-lab-footer">
      <div class="character-lab-views">
        <button data-view="front" type="button">Face</button>
        <button data-view="three-quarter" type="button" class="active">Trois quarts</button>
        <button data-view="side" type="button">Profil</button>
      </div>
      <small id="character-lab-status">Chargement du modèle GLB…</small>
      <span>Glisser : tourner · Molette : zoomer · Modèle statique</span>
    </footer>`;
  document.body.append(root);
  const host = root.querySelector<HTMLElement>('.character-lab-stage')!;
  const status = root.querySelector<HTMLElement>('#character-lab-status')!;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  configureRenderer(renderer);
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(studioBackground);
  addDaylight(scene, true);
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.6, .16, 48),
    new THREE.MeshStandardMaterial({ color: 0x9b8765, roughness: 1 })
  );
  floor.position.y = -.16;
  floor.receiveShadow = true;
  scene.add(floor);
  const turf = new THREE.Mesh(
    new THREE.CircleGeometry(1.52, 48),
    new THREE.MeshStandardMaterial({ color: 0x99b86d, roughness: 1 })
  );
  turf.rotation.x = -Math.PI / 2;
  turf.position.y = -.075;
  turf.receiveShadow = true;
  scene.add(turf);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  let yaw = .63, elevation = .22, distance = 5.6;
  const updateCamera = () => {
    const h = Math.cos(elevation) * distance;
    camera.position.set(Math.sin(yaw) * h, 1.18 + Math.sin(elevation) * distance, Math.cos(yaw) * h);
    camera.lookAt(0, 1.16, 0);
  };
  updateCamera();
  let actor: THREE.Group | undefined;
  let alive = true;
  new GLTFLoader().load('/assets/gardener-v040.glb', gltf => {
    if (!alive) return;
    actor = gltf.scene;
    actor.traverse(node => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    scene.add(actor);
    const meshes = actor.children.length;
    status.textContent = `Modèle Blender · GLB chargé · ${meshes} groupes`;
    renderer.shadowMap.needsUpdate = true;
  }, undefined, error => {
    status.textContent = 'Impossible de charger public/assets/gardener-v040.glb';
    console.error('Character Lab:', error);
  });
  const angles: Record<string, number> = { front: 0, 'three-quarter': .63, side: Math.PI / 2 };
  root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => {
    button.onclick = () => {
      yaw = angles[button.dataset.view!] ?? .63;
      elevation = .22;
      root.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === button));
      updateCamera();
    };
  });
  const canvas = renderer.domElement;
  canvas.style.touchAction = 'none';
  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', event => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    yaw -= (event.clientX - lastX) * .008;
    elevation = THREE.MathUtils.clamp(elevation + (event.clientY - lastY) * .006, -.23, 1.10);
    lastX = event.clientX;
    lastY = event.clientY;
    updateCamera();
  });
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    distance = THREE.MathUtils.clamp(distance * (event.deltaY > 0 ? 1.10 : .9), 3.1, 10);
    updateCamera();
  }, { passive: false });
  const resize = () => {
    const width = host.clientWidth, height = host.clientHeight;
    if (width < 2 || height < 2) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  let frame = 0;
  const loop = () => {
    if (!alive) return;
    frame = requestAnimationFrame(loop);
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(loop);
  root.querySelector<HTMLButtonElement>('#character-lab-close')!.onclick = () => {
    alive = false;
    cancelAnimationFrame(frame);
    observer.disconnect();
    scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const mats = Array.isArray(object.material) ? object.material : [object.material];
        mats.forEach(mat => mat.dispose());
      }
    });
    renderer.dispose();
    root.remove();
  };
}
