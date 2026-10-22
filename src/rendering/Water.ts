import * as THREE from 'three';

export const waterTime = { value: 0 };
export const waterLevel = .025;
export function shoreRadius(angle: number) {
  return 1.07 + .105 * Math.sin(angle * 3 + .3) + .06 * Math.cos(angle * 7 - .4);
}
export function shorePoint(angle: number, scale = 1) {
  const radius = shoreRadius(angle) * scale;
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius * .8 };
}
export function shoreDistance(x: number, z: number) {
  return Math.hypot(x, z / .8) / shoreRadius(Math.atan2(z / .8, x));
}

const waterMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: waterTime,
    uDeep: { value: new THREE.Color(0x246a70) },
    uShallow: { value: new THREE.Color(0x73bba0) },
    uGlint: { value: new THREE.Color(0xe2f2dc) },
  },
  vertexShader: /* glsl */`
    varying vec2 vWater;
    void main() {
      vWater = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform float uTime;
    uniform vec3 uDeep;
    uniform vec3 uShallow;
    uniform vec3 uGlint;
    varying vec2 vWater;
    float ring(vec2 p, vec2 center, float phase) {
      float age = fract(uTime * .13 + phase);
      float d = length((p - center) * vec2(1., 1.18));
      float edge = abs(d - (.06 + age * .58));
      return (1. - smoothstep(.008, .024, edge)) * sin(age * 3.14159) * .20;
    }
    void main() {
      vec2 p = vWater;
      float radius = length(p);
      float wave = sin(p.x * 9. + p.y * 7. + uTime * .48)
                 * sin(p.y * 11. - p.x * 3. - uTime * .33);
      float shallows = smoothstep(.40, 1., radius);
      vec3 color = mix(uDeep, uShallow, shallows * .85 + wave * .035);
      // Quiet, elongated sky reflections, broken by broad surface ripples.
      float streak = sin(p.y * 32. + p.x * 8. + sin(p.x * 10. + uTime * .3) * .7 + uTime * .25);
      float glint = smoothstep(.96, 1., streak) * (.5 + .5 * sin(p.x * 13. + p.y * 3.));
      float reflection = glint * .18 * (1. - smoothstep(.65, .96, radius));
      reflection += ring(p, vec2(-.28, .16), 0.) + ring(p, vec2(.38, -.27), .53);
      color = mix(color, uGlint, reflection);
      // A thin waterline follows the actual irregular perimeter through UVs.
      color = mix(color, uShallow * 1.15, smoothstep(.96, 1., radius) * .55);
      gl_FragColor = vec4(color, 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});

/** One opaque surface and one shared material, without reflection render targets. */
export function createWater() {
  const steps = 64;
  const positions = [0, waterLevel, 0], uv = [0, 0], indices: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = i * Math.PI * 2 / steps, q = shorePoint(angle);
    positions.push(q.x, waterLevel, q.z);
    uv.push(Math.cos(angle), Math.sin(angle));
    if (i < steps) indices.push(0, i + 2, i + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, waterMaterial);
}
