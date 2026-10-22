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

export type SunPreset = 'clear' | 'golden' | 'soft';
export const SUN_PRESETS: Record<SunPreset, {name:string;sky:number;ground:number;ambient:number;color:number;power:number;shadow:number;position:[number,number,number];exposure:number}> = {
  clear:{name:'Soleil franc',sky:0xfaf6e9,ground:0x7c806e,ambient:1.12,color:0xfff3d9,power:3.25,shadow:.67,position:[-5,10,5],exposure:1.03},
  golden:{name:'Soleil chaleureux',sky:0xfff8eb,ground:0x77755e,ambient:1.12,color:0xffe9bb,power:3.05,shadow:.59,position:[-6,9,4],exposure:1.02},
  soft:{name:'Lumière diffuse',sky:0xf1f5ed,ground:0x898a78,ambient:1.7,color:0xfff5e7,power:1.85,shadow:.38,position:[-3,11,6],exposure:1.05},
};
const rigs=new WeakMap<THREE.Scene,{sky:THREE.HemisphereLight,sun:THREE.DirectionalLight,renderer?:THREE.WebGLRenderer}>();
export function applySunPreset(scene:THREE.Scene,preset:SunPreset,renderer?:THREE.WebGLRenderer){
 const rig=rigs.get(scene);if(!rig)return;
 const p=SUN_PRESETS[preset];
 rig.sky.color.setHex(p.sky);rig.sky.groundColor.setHex(p.ground);rig.sky.intensity=p.ambient;
 rig.sun.color.setHex(p.color);rig.sun.intensity=p.power;rig.sun.position.set(...p.position);
 rig.sun.shadow.intensity=p.shadow;rig.sun.shadow.needsUpdate=true;
 const r=renderer??rig.renderer;if(r){r.toneMappingExposure=p.exposure;r.shadowMap.needsUpdate=true;}
}
export function addDaylight(scene:THREE.Scene,studio=false){
 scene.background=new THREE.Color(studioBackground);
 const sky=new THREE.HemisphereLight();scene.add(sky);
 const sun=new THREE.DirectionalLight();sun.castShadow=true;
 const extent=studio?4:9;
 sun.shadow.camera.left=sun.shadow.camera.bottom=-extent;
 sun.shadow.camera.right=sun.shadow.camera.top=extent;
 sun.shadow.camera.near=.5;sun.shadow.camera.far=30;
 sun.shadow.mapSize.set(2048,2048);sun.shadow.radius=3;
 sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;
 scene.add(sun);rigs.set(scene,{sky,sun});applySunPreset(scene,'clear');
}
