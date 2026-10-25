import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {makeShovel,poseShovel,type ShovelAction} from './shovel';

const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
const ease=(x:number)=>{const t=THREE.MathUtils.clamp(x,0,1);return t*t*(3-2*t);};

export function makeGardener(){
 const group=new THREE.Group();
 const cloth=new THREE.MeshStandardMaterial({color:0x9da96c,flatShading:true,roughness:1});
 const dungarees=new THREE.MeshStandardMaterial({color:0x627f82,flatShading:true,roughness:1});
 const skin=new THREE.MeshStandardMaterial({color:0xe1b68e,flatShading:true,roughness:1});
 const boots=new THREE.MeshStandardMaterial({color:0x65584a,flatShading:true,roughness:1});
 const hat=new THREE.MeshStandardMaterial({color:0xbca16c,flatShading:true,roughness:1});
 const ink=new THREE.MeshStandardMaterial({color:0x423e36,roughness:1});
 const blob=(parent:THREE.Group,material:THREE.Material,pos:THREE.Vector3,scale:THREE.Vector3,segments=9)=>{
  const m=new THREE.Mesh(new THREE.SphereGeometry(1,segments,6),material);
  m.position.copy(pos);m.scale.copy(scale);m.castShadow=true;parent.add(m);return m;
 };
 blob(group,boots,v(-.17,.12,.025),v(.16,.17,.23));blob(group,boots,v(.17,.12,.025),v(.16,.17,.23));
 blob(group,dungarees,v(-.17,.42,0),v(.16,.29,.17));blob(group,dungarees,v(.17,.42,0),v(.16,.29,.17));
 blob(group,cloth,v(0,.93,0),v(.40,.48,.29));
 blob(group,dungarees,v(0,.79,-.027),v(.33,.27,.29));
 blob(group,skin,v(0,1.49,-.015),v(.34,.38,.32),10);
 // Simple eyes and tiny nose; the character faces local -Z.
 for(const x of [-.12,.12])blob(group,ink,v(x,1.51,-.307),v(.025,.03,.015),6);
 blob(group,skin,v(0,1.39,-.341),v(.055,.052,.035),7);
 // Rounded gardener bucket hat, small flat brim.
 const brim=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.07,12),hat);brim.position.y=1.77;brim.castShadow=true;group.add(brim);
 const crown=new THREE.Mesh(new THREE.CylinderGeometry(.28,.33,.22,10),hat);crown.position.y=1.89;crown.castShadow=true;group.add(crown);
 const shovel=makeShovel();group.add(shovel.group);
 shovel.group.position.set(0,.24,-.58);
 const limbMaterial=cloth;
 const armGeo=new THREE.CylinderGeometry(.085,.10,1,7);
 const foreGeo=new THREE.CylinderGeometry(.066,.079,1,7);
 const upper=[-1,1].map(()=>{const m=new THREE.Mesh(armGeo,limbMaterial);m.castShadow=true;group.add(m);return m;});
 const fore=[-1,1].map(()=>{const m=new THREE.Mesh(foreGeo,skin);m.castShadow=true;group.add(m);return m;});
 const hands=[-1,1].map(()=>blob(group,skin,v(0,0,0),v(.09,.10,.105),8));
 const direct=new THREE.Vector3(0,1,0);
 const segment=(mesh:THREE.Mesh,a:THREE.Vector3,b:THREE.Vector3)=>{
  const delta=b.clone().sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(direct,delta.clone().normalize());mesh.scale.y=delta.length();
 };
 // Load the Blender-skinned actor asynchronously. The old procedural actor is
 // retained solely as a fallback if WebGL/glTF loading fails.
 let mixer:THREE.AnimationMixer|null=null;
 let loadedClips:Partial<Record<ShovelAction,THREE.AnimationClip>>={};
 let active:ShovelAction|null=null;
 let currentAction:THREE.AnimationAction|null=null;
 const legacyChildren=[...group.children];
 new GLTFLoader().load('/assets/gardener-v044.glb',gltf=>{
  const find=(name:string)=>gltf.animations.find(clip=>clip.name.toLowerCase().includes(name));
  const clips={dig:find('dig'),fill:find('fill'),level:find('level')};
  if(!clips.dig||!clips.fill||!clips.level){
   console.error('Komorebi V0.44: GLB incomplet, gestes manquants');return;
  }
  for(const child of legacyChildren)child.visible=false;
  const visual=gltf.scene;
  visual.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.castShadow=true;obj.receiveShadow=true;}});
  group.add(visual);mixer=new THREE.AnimationMixer(visual);
  loadedClips=clips;active=null;currentAction=null;
  pose('dig',0);
 },undefined,error=>console.error('Komorebi V0.44: chargement du rig échoué',error));
 function pose(mode:ShovelAction,phase:number){
  if(mixer&&loadedClips[mode]){
   const clip=loadedClips[mode]!;
   if(active!==mode){mixer.stopAllAction();currentAction=mixer.clipAction(clip);currentAction.reset().play();active=mode;}
   // The same absolute phase is used by Earthworks and the workshop.
   mixer.setTime(Math.min(.9999,Math.max(0,phase))*clip.duration);
   mixer.update(0);
   return;
  }
  const t=THREE.MathUtils.clamp(phase,0,1);
  poseShovel(shovel.tool,shovel.soil,mode,t);
  // Small body anticipation: no exaggerated horizontal waggle.
  const dip=mode==='dig'?.085*ease(t/.34)-.085*ease((t-.5)/.35):mode==='level'?.055*Math.sin(Math.PI*t*2)**2:0;
  group.children.forEach(()=>{});
  shovel.group.position.set(0,.20-dip,-.59);
  shovel.group.updateMatrixWorld(true);group.updateMatrixWorld(true);
  for(let k=0;k<2;k++){
   const side=k===0?-1:1;
   const shoulder=v(side*.32,1.14,-.015);
   const grasp=side===-1?v(-.027,.93,0):v(.027,.60,0);
   const hand=group.worldToLocal(shovel.tool.localToWorld(grasp));
   const elbow=shoulder.clone().lerp(hand,.53).add(v(side*.22,-.055,.12));
   segment(upper[k],shoulder,elbow);segment(fore[k],elbow,hand);hands[k].position.copy(hand);
  }
 }
 pose('dig',0);
 return {group,shovel,pose};
}
