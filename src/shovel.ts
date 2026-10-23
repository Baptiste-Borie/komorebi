import * as THREE from 'three';

export type ShovelAction = 'dig'|'fill'|'level';
export const CYCLE_DURATION: Record<ShovelAction,number> = {dig:850,fill:760,level:530};
export const EFFECT_AT: Record<ShovelAction,number> = {dig:.57,fill:.78,level:.42};
const clamp=THREE.MathUtils.clamp;
const smooth=(t:number)=>{const q=clamp(t,0,1);return q*q*(3-2*q);};

/** Connected geometry in local coordinates. The bottom of the steel scoop is y=0. */
export function makeShovel():{group:THREE.Group,tool:THREE.Group,soil:THREE.Group}{
 const group=new THREE.Group(),tool=new THREE.Group();group.add(tool);
 const wood=new THREE.MeshStandardMaterial({color:0x947049,roughness:.96,flatShading:true});
 const steel=new THREE.MeshStandardMaterial({color:0x849395,roughness:.72,metalness:.13,flatShading:true});
 const dark=new THREE.MeshStandardMaterial({color:0x677879,roughness:.86,flatShading:true});
 const dirt=new THREE.MeshStandardMaterial({color:0x927052,roughness:1,flatShading:true});
 const cylinder=(a:THREE.Vector3,b:THREE.Vector3,r:number,mat:THREE.Material)=>{
  const delta=b.clone().sub(a),mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),mat);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());mesh.castShadow=true;tool.add(mesh);
 };
 // Straight continuous shaft with a minimal rounded upper grip.
 cylinder(new THREE.Vector3(0,.24,0),new THREE.Vector3(0,1.12,0),.027,wood);
 cylinder(new THREE.Vector3(0,.12,0),new THREE.Vector3(0,.34,0),.042,dark);
 cylinder(new THREE.Vector3(0,1.085,0),new THREE.Vector3(0,1.15,0),.037,wood);
 // Low-poly spade blade, coherent silhouette, connected to metal socket.
 const outline=new THREE.Shape();
 outline.moveTo(-.14,.21);outline.lineTo(.14,.21);outline.lineTo(.14,.11);
 outline.lineTo(.11,.015);outline.lineTo(0,-.16);outline.lineTo(-.11,.015);outline.lineTo(-.14,.11);outline.closePath();
 const geometry=new THREE.ExtrudeGeometry(outline,{depth:.035,bevelEnabled:true,bevelSize:.009,bevelThickness:.006,bevelSegments:1,curveSegments:1});
 const blade=new THREE.Mesh(geometry,steel);blade.position.y=.17;blade.castShadow=true;tool.add(blade);
 const soil=new THREE.Group();tool.add(soil);
 for(let i=0;i<4;i++){const piece=new THREE.Mesh(new THREE.DodecahedronGeometry(.044+(i%2)*.010,0),dirt);
  piece.position.set((i-1.5)*.055,.19,-.065);soil.add(piece);}
 soil.visible=false;tool.scale.setScalar(.75);return {group,tool,soil};
}

/** Stable pose evaluation, used identically in the garden and the workshop. */
export function poseShovel(tool:THREE.Group,soil:THREE.Group,mode:ShovelAction,phase:number){
 const t=clamp(phase,0,1);tool.position.set(0,0,0);tool.rotation.set(0,0,0);
 if(mode==='dig'){
  // Vertical insertion, slight lever, vertical lift. No lateral sweep.
  const enter=smooth(t/.30),lift=smooth((t-.40)/.35),settle=smooth((t-.82)/.18);
  tool.position.y=.34-.46*enter+.57*lift-.45*settle;
  tool.rotation.x=-.15*enter+.28*smooth((t-.31)/.24)-.13*smooth((t-.72)/.22);
  soil.visible=t>.49&&t<.87;
 }else if(mode==='fill'){
  // Arrive with soil, roll the blade forward about its own longitudinal axis.
  tool.position.y=.30-.08*smooth(t/.35)+.12*smooth((t-.82)/.18);
  tool.rotation.y=.10;
  tool.rotation.x=.03+1.28*smooth((t-.47)/.34);
  soil.visible=t<.75;
 }else{
  // Back-facing spade taps the ground twice, with vertical rebounds.
  tool.rotation.x=Math.PI*.88;
  tool.position.y=.20+.13*Math.abs(Math.sin(t*Math.PI*2));
  soil.visible=false;
 }
}
