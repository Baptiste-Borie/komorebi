import * as THREE from 'three';
import { styleSurface, type SurfaceStyle } from './SurfaceShader';

const materials = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: number, roughness = 1, surface: SurfaceStyle | 'plain' = 'botanical') {
  const key = `${color}-${roughness}-${surface}`;
  let material = materials.get(key);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
    if(surface!=='plain')styleSurface(material,surface);
    materials.set(key, material);
  }
  return material;
}

// All faceted colors share a single material, so batching can merge whole
// crowns and flower heads rather than producing one draw call per pigment.
const facetMaterial = styleSurface(new THREE.MeshStandardMaterial({
  vertexColors: true, flatShading: true, roughness: .92,
}), 'botanical');
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
    const variation = .985 + .035 * Math.sin(face * 2.39996 + color * .0002);
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

/** Bake broad canopy shelter once per rebuild. Ellipsoid proxies only, not
 * ray tracing: pigment gets darker near neighboring lobes, rather than by a
 * random triangle index. Attributes survive the existing geometry merge. */
export function bakeCanopyShelter(group:THREE.Group) {
  const lobes=group.children.filter((o):o is THREE.Mesh=>o instanceof THREE.Mesh&&o.userData.canopy);
  const inverse=new Map<THREE.Mesh,THREE.Matrix4>();
  for(const lobe of lobes){lobe.updateMatrix();inverse.set(lobe,lobe.matrix.clone().invert());lobe.geometry.computeBoundingSphere();}
  const point=new THREE.Vector3(),local=new THREE.Vector3();
  for(const lobe of lobes){
    const positions=lobe.geometry.getAttribute('position'),colors=lobe.geometry.getAttribute('color');
    if(!colors)continue;
    for(let i=0;i<positions.count;i++){
      point.fromBufferAttribute(positions,i).applyMatrix4(lobe.matrix);
      let shelter=0;
      for(const other of lobes){if(other===lobe)continue;
        local.copy(point).applyMatrix4(inverse.get(other)!);
        const sphere=other.geometry.boundingSphere!;
        const distance=local.distanceTo(sphere.center)/Math.max(.001,sphere.radius);
        shelter=Math.max(shelter,1-THREE.MathUtils.smoothstep(distance,.88,1.35));
      }
      const shade=1-.18*shelter;
      colors.setXYZ(i,colors.getX(i)*shade,colors.getY(i)*shade,colors.getZ(i)*shade);
    }
  }
}
