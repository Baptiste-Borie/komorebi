import * as THREE from 'three';

/** Original, deterministic surface atlas. RGBA stores broad pigment, leaf
 * shapes, veins and grain independently of the botanical color palette.
 * No Townscaper image, UV layout or shader code is used. */
const size = 128;
const pixels = new Uint8Array(size * size * 4);
function hash(x: number, y: number) {
  const value = Math.sin(x * 127.1 + y * 311.7 + 41.3) * 43758.5453;
  return value - Math.floor(value);
}
function noise(x: number, y: number, period: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const h = (a: number, b: number) => hash((a + period) % period, (b + period) % period);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(h(ix, iy), h(ix + 1, iy), u),
    THREE.MathUtils.lerp(h(ix, iy + 1), h(ix + 1, iy + 1), u), v);
}
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const u = (x + .5) / size, v = (y + .5) / size;
  const cx = Math.floor(u * 8), cy = Math.floor(v * 8);
  let leaf = 0, vein = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const sx = cx + i, sy = cy + j, h = hash((sx + 8) % 8, (sy + 8) % 8);
    const angle = h * Math.PI;
    const dx = u * 8 - sx - .25 - h * .5, dy = v * 8 - sy - .35 - h * .3;
    const a = (dx * Math.cos(angle) + dy * Math.sin(angle)) / (.38 + .08 * h);
    const b = (-dx * Math.sin(angle) + dy * Math.cos(angle)) / .22;
    const mask = 1 - THREE.MathUtils.smoothstep(a * a + b * b, .55, 1.0);
    leaf = Math.max(leaf, mask * (.65 + h * .35));
    vein = Math.max(vein, mask * (1 - THREE.MathUtils.smoothstep(Math.abs(b), .03, .18)));
  }
  pixels.set([
    Math.round((noise(u * 4, v * 4, 4) * .65 + noise(u * 8, v * 8, 8) * .35) * 255),
    Math.round(leaf * 255), Math.round(vein * 255), Math.round(hash(x, y) * 255),
  ], (y * size + x) * 4);
}
export const surfaceTexture = new THREE.DataTexture(pixels, size, size);
surfaceTexture.wrapS = surfaceTexture.wrapT = THREE.RepeatWrapping;
surfaceTexture.magFilter = THREE.LinearFilter;
surfaceTexture.minFilter = THREE.LinearMipmapLinearFilter;
surfaceTexture.generateMipmaps = true;
surfaceTexture.needsUpdate = true;
