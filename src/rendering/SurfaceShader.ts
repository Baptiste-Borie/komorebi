import * as THREE from 'three';
import { surfaceTexture } from './SurfaceTexture';

export type SurfaceStyle = 'botanical' | 'ground' | 'bark';
export const surfaceStudy = { value: 1 };

/** Retain Three's lights, shadows, instancing and color management. Only the
 * pigment and subtle stylized fill are changed; this adds no render pass. */
export function styleSurface(material: THREE.MeshStandardMaterial, style: SurfaceStyle) {
  const mode = style === 'ground' ? 1 : style === 'bark' ? 2 : 0;
  material.onBeforeCompile = shader => {
    shader.uniforms.kSurface = { value: surfaceTexture };
    shader.uniforms.kStudy = surfaceStudy;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      varying vec3 kWorld;`);
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vec4 kPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        kPosition = instanceMatrix * kPosition;
      #endif
      kWorld = (modelMatrix * kPosition).xyz;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D kSurface;
      uniform float kStudy;
      varying vec3 kWorld;
      vec4 kTexture(vec3 p, vec3 n) {
        // Flat botanical facets use their dominant plane: one sample instead
        // of three blended triplanar samples, with stable world-space scale.
        vec3 w = abs(n);
        vec2 uv = w.y >= w.x && w.y >= w.z ? p.xz : (w.x >= w.z ? p.yz : p.xy);
        return texture2D(kSurface, uv);
      }`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      if (kStudy > .5) {
      vec3 kNormal = normalize(cross(dFdx(kWorld), dFdy(kWorld)));
      vec4 kTex = kTexture(kWorld * .92, kNormal);
      float kVisible = 1. - smoothstep(.018, .06, length(fwidth(kWorld)));
      vec3 kOriginal = diffuseColor.rgb;
      ${mode === 1 ? /* glsl */`
        float broad = texture2D(kSurface, kWorld.xz * .13).r;
        float kPatch = smoothstep(.30, .70, texture2D(kSurface, kWorld.xz * .46).r);
        diffuseColor.rgb *= .87 + broad * .16 + kPatch * .14;
        diffuseColor.rgb *= 1. + (kTex.a - .5) * .055 * kVisible;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.08,1.03,.85), kTex.g*.09*kVisible);
      ` : mode === 2 ? /* glsl */`
        float grain = texture2D(kSurface, vec2(kWorld.x + kWorld.z, kWorld.y * .12)*2.).r;
        diffuseColor.rgb *= .88 + grain * .25;
      ` : /* glsl */`
        float foliage = step(diffuseColor.r * 1.12, diffuseColor.g) * step(diffuseColor.b * 1.15, diffuseColor.g);
        float leaf = (kTex.g - .25) * kVisible;
        diffuseColor.rgb *= 1. + (kTex.r-.5)*.16 + leaf*.23*foliage;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.20,1.08,.82), kTex.b*.11*foliage*kVisible);
        diffuseColor.rgb *= 1. + (kTex.a-.5)*.045*kVisible*(1.-foliage);
      `}
      diffuseColor.rgb = mix(kOriginal, diffuseColor.rgb, kStudy);
      }
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', /* glsl */`
      // A restrained green-blue bounce keeps sheltered faces legible. Actual
      // shadowing and the original daylight remain responsible for the volume.
      float kFoliage = step(diffuseColor.r*1.12,diffuseColor.g)*step(diffuseColor.b*1.15,diffuseColor.g);
      outgoingLight += diffuseColor.rgb * vec3(.025,.045,.055) * kFoliage * kStudy;
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey = () => `komorebi-surface-v023-${style}`;
  return material;
}
