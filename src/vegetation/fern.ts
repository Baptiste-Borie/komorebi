import * as THREE from 'three';
import { styleSurface } from '../rendering/SurfaceShader';

const colors = [0x467b40, 0x538947, 0x60974e, 0x73a45d, 0x86b368];
const materials = colors.map(color => styleSurface(new THREE.MeshStandardMaterial({color, roughness: 1, flatShading: true, side: THREE.DoubleSide}),'botanical'));
const rachisMaterial = new THREE.MeshStandardMaterial({color: 0x47723b, roughness: 1, flatShading: true});

/** Low-poly fern with paired pinnules along curved, tapering fronds.
 *  Each frond uses a coherent orientation; it is not a cloud of triangles. */
export function createFern(seed: number): THREE.Group {
  const group = new THREE.Group();
  const rand = (n: number) => {
    const v = Math.sin((seed + 17) * 127.1 + n * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const rachisGeo = new THREE.CylinderGeometry(.004, .009, 1, 4);
  const count = 9 + Math.floor(rand(1) * 4);
  for (let frond = 0; frond < count; frond++) {
    const angle = (frond / count) * Math.PI * 2 + (rand(frond + 3) - .5) * .26;
    const spread = .62 + rand(frond + 16) * .30;
    const tall = .40 + rand(frond + 27) * .28;
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const sideways = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
    const point = (t: number) => new THREE.Vector3(
      direction.x * spread * Math.pow(Math.sin(t * Math.PI / 2), 1.25),
      tall * Math.sin(t * Math.PI * .88),
      direction.z * spread * Math.pow(Math.sin(t * Math.PI / 2), 1.25)
    );
    const segments = 15;
    for (let j = 0; j < segments; j++) {
      const t0 = j / segments, t1 = (j + 1) / segments;
      const start = point(t0), end = point(t1);
      const d = end.clone().sub(start);
      const rachis = new THREE.Mesh(rachisGeo, rachisMaterial);
      rachis.position.copy(start).add(end).multiplyScalar(.5);
      rachis.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      rachis.scale.y = d.length();
      rachis.castShadow = false;
      group.add(rachis);
      if (j === 0 || j === segments - 1) continue;
      const midT = (t0 + t1) * .5;
      const stem = point(midT);
      const profile = Math.pow(Math.sin(Math.PI * midT), .85);
      const length = (.18 + .11 * rand(frond * 31 + j)) * profile;
      for (const side of [-1, 1]) {
        // Small, tapered leaflets reach sideways and angle toward the tip.
        const leafTip = stem.clone().addScaledVector(sideways, side * length)
          .addScaledVector(direction, .055 + midT * .04);
        leafTip.y -= .025 * midT;
        const leading = stem.clone().lerp(leafTip, .35).addScaledVector(direction, .035);
        const trailing = stem.clone().lerp(leafTip, .62).addScaledVector(direction, -.025);
        leading.y += .015;
        const verts = [
          stem.x, stem.y, stem.z,
          leading.x, leading.y, leading.z,
          leafTip.x, leafTip.y, leafTip.z,
          stem.x, stem.y, stem.z,
          leafTip.x, leafTip.y, leafTip.z,
          trailing.x, trailing.y, trailing.z,
        ];
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.computeVertexNormals();
        const leaf = new THREE.Mesh(geo, materials[(frond + seed) % materials.length]);
        leaf.castShadow = false;
        group.add(leaf);
      }
    }
  }
  return group;
}
