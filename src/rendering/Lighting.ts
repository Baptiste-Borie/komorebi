import * as THREE from 'three';

export const studioBackground = 0xe7e6dc;

/** Shared daylight calibration: preserve botanical pigments instead of washing
 * them out with a high exposure and a strongly yellow key light. */
export function configureRenderer(renderer: THREE.WebGLRenderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Only geometry edits change shadows. Water animates without shadow passes.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
}

export function addDaylight(scene: THREE.Scene, studio = false) {
  scene.background = new THREE.Color(studioBackground);
  scene.add(new THREE.HemisphereLight(0xf1f6ff, 0x74805b, 1.25));
  const sun = new THREE.DirectionalLight(0xfff4dc, 2.65);
  sun.position.set(-3.5, 9, 5);
  sun.castShadow = true;
  const extent = studio ? 4 : 9;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -extent;
  sun.shadow.camera.right = sun.shadow.camera.top = extent;
  sun.shadow.camera.near = .5;
  sun.shadow.camera.far = 30;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 2.5;
  sun.shadow.normalBias = .035;
  sun.shadow.bias = -.00015;
  sun.shadow.intensity = .62;
  scene.add(sun);
}
