import * as THREE from 'three';

const materials = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: number, roughness = 1) {
  const key = `${color}-${roughness}`;
  let material = materials.get(key);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
    materials.set(key, material);
  }
  return material;
}

// All faceted colors share a single material, so batching can merge whole
// crowns and flower heads rather than producing one draw call per pigment.
const facetMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true, flatShading: true, roughness: .92,
});
const sunTint = new THREE.Color(0xe9ee9c);
export function facetSurface(geometry: THREE.BufferGeometry, color: number) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  const pos = geo.getAttribute('position');
  const normals = geo.getAttribute('normal');
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(color);
  const bounds = geo.boundingBox!;
  const height = Math.max(.001, bounds.max.y - bounds.min.y);
  const tone = new THREE.Color();
  // A continuous underside-to-tip value gradient plus restrained per-face
  // variation gives volume without unrelated triangles looking like confetti.
  const foliage = base.g > base.r * 1.12 && base.g > base.b * 1.15;
  for (let i = 0; i < pos.count; i++) {
    const face = Math.floor(i / 3);
    const variation = .96 + .07 * Math.sin(face * 2.39996 + color * .0002);
    const vertical = (pos.getY(i) - bounds.min.y) / height;
    tone.copy(base).multiplyScalar(variation * (foliage ? .76 + .28 * vertical : .95 + .08 * vertical));
    if (foliage) tone.lerp(sunTint, .055 * Math.max(0, normals.getY(i)) * vertical);
    colors.set([tone.r, tone.g, tone.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return { geometry: geo, material: facetMaterial };
}

// A small analytic radial mask; no image asset, no per-plant texture allocation.
const size = 64, pixels = new Uint8Array(size * size * 4);
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const radius = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1);
  const offset = (y * size + x) * 4;
  pixels.set([255, 255, 255, Math.round(Math.pow(Math.max(0, 1 - radius), 2) * 255)], offset);
}
const contactMap = new THREE.DataTexture(pixels, size, size);
contactMap.magFilter = contactMap.minFilter = THREE.LinearFilter;
contactMap.needsUpdate = true;
export const contactMaterial = new THREE.MeshBasicMaterial({
  color: 0x30432a, map: contactMap, transparent: true, opacity: .32,
  depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
});
