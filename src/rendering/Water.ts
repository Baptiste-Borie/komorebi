import * as THREE from 'three';
import { surfaceTexture } from './SurfaceTexture';

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
    uSurface: { value: surfaceTexture },
    uDeep: { value: new THREE.Color(0x2c8589) },
    uShallow: { value: new THREE.Color(0x85bea4) },
    uGlint: { value: new THREE.Color(0xe2f2dc) },
  },
  vertexShader: /* glsl */`
    varying vec2 vWater;
    varying vec3 vWorld;
    void main() {
      vWater = uv;
      vWorld = (modelMatrix * vec4(position,1.)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform float uTime;
    uniform sampler2D uSurface;
    uniform vec3 uDeep;
    uniform vec3 uShallow;
    uniform vec3 uGlint;
    varying vec2 vWater;
    varying vec3 vWorld;
    float ring(vec2 p, vec2 center, float phase) {
      float age = fract(uTime * .13 + phase);
      float d = length((p - center) * vec2(1., 1.18));
      float edge = abs(d - (.06 + age * .58));
      float aa=max(fwidth(d),.002);
      return (1. - smoothstep(.004, .009+aa, edge)) * sin(age * 3.14159) * .12;
    }
    void main() {
      vec2 p = vWater;
      float radius = length(p);
      float phaseX = p.x*7.+p.y*3.+uTime*.30;
      float phaseZ = p.y*9.-p.x*2.-uTime*.23;
      vec2 displacement=vec2(sin(phaseX),cos(phaseZ))*.012;
      vec2 bed=p+displacement;
      float pigment=texture2D(uSurface,bed*.65).r;
      float shallows=smoothstep(.28,1.,length(bed+vec2(.06,-.04)));
      vec3 color=mix(uDeep,uShallow,shallows*.85+(pigment-.5)*.10);
      // Soft caustic fragments are visible mainly in the shallows; derivative
      // filtering prevents thin bands shimmering at distant camera settings.
      float cells=sin(bed.x*18.+sin(bed.y*13.+uTime*.18))
                 +sin(bed.y*17.-sin(bed.x*11.-uTime*.16));
      float aa=max(fwidth(cells),.05);
      float caustic=1.-smoothstep(.04,.14+aa,abs(cells));
      color+=uGlint*caustic*.045*smoothstep(.3,.85,radius);
      vec3 surfaceNormal=normalize(vec3(-cos(phaseX)*.055,1.,sin(phaseZ)*.045));
      vec3 view=normalize(cameraPosition-vWorld);
      float fresnel=pow(1.-max(0.,dot(surfaceNormal,view)),3.);
      // Broad sky sheen changes with angle; it is not a scene reflection.
      float sheen=smoothstep(-.25,.75,sin(p.x*2.+p.y*4.+uTime*.12));
      color=mix(color,vec3(.39,.65,.65),(.055+fresnel*.22)*sheen);
      float streak=sin(p.y*25.+p.x*5.+sin(p.x*8.+uTime*.22)*.7+uTime*.18);
      float glint=smoothstep(.95,1.,streak)*smoothstep(.25,.75,pigment);
      float reflection=glint*.13*(1.-smoothstep(.65,.96,radius));
      reflection+=ring(p,vec2(-.28,.16),0.)+ring(p,vec2(.38,-.27),.53);
      color=mix(color,uGlint,reflection);
      float shoreline=1.-smoothstep(.006,.022+fwidth(radius),abs(radius-.985));
      color=mix(color,uGlint,shoreline*.27);
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
