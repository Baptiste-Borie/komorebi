/** Native Three.js observations for the generated V0.44 Rig_Medium asset. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
globalThis.ProgressEvent??=class{constructor(type,values){Object.assign(this,{type},values)}};
const source=resolve('public/assets/kaykit-v045/gardener-v044-rig-medium.glb');
const bytes=await readFile(source);const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');
const scene=gltf.scene,clip=gltf.animations.find(a=>a.name==='Digging');scene.updateMatrixWorld(true);
const visible=[];scene.traverse(o=>{if(o.isMesh&&!o.name.includes('spade')&&!o.name.includes('shaft')&&!o.name.includes('collar')&&!o.name.includes('soil_chunk'))visible.push(o)});
const H=new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3()).y;
const arms=scene.children.flatMap(()=>[]);scene.traverse(o=>{if(o.isSkinnedMesh&&o.name.startsWith('V044_Arm_L_'))arms.push(o)});
if(arms.length!==2)throw Error(`Expected two V0.44 arms, got ${arms.length}`);
const topology={};const selected={};
for(const mesh of arms){
 const side=mesh.name.endsWith('001')?'r':'l';const hand=mesh.skeleton.bones.findIndex(b=>b.name===`hand${side}`);const ids=[];
 for(let i=0;i<mesh.geometry.attributes.position.count;i++){
  let weight=0;for(let k=0;k<4;k++)if(mesh.geometry.attributes.skinIndex.getComponent(i,k)===hand)weight+=mesh.geometry.attributes.skinWeight.getComponent(i,k);
  if(weight>=.5)ids.push(i);
 }
 const lookup=new Map(ids.map((id,i)=>[id,i])),triangles=[];
 for(let i=0;i<mesh.geometry.index.count;i+=3){const tri=[0,1,2].map(k=>mesh.geometry.index.getX(i+k));if(tri.every(x=>lookup.has(x)))triangles.push(tri.map(x=>lookup.get(x)));}
 selected[side]={mesh,ids};topology[side]={mesh:mesh.name,vertex_ids:ids,triangles};
}
const mixer=new THREE.AnimationMixer(scene),action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
// Reuse the exact 143 timestamps established by the original-contact
// diagnosis, including native keys and the fixed 10 ms sampling grid.
const csv=await readFile(resolve('reviews/digging-measures/ranger/frames.csv'),'utf8');
const header=csv.trim().split(/\r?\n/)[0].split(','),timeColumn=header.indexOf('time_s');
const ordered=csv.trim().split(/\r?\n/).slice(1).map(line=>Number(line.split(',')[timeColumn])),samples=[];
if(ordered.length!==143)throw Error(`Expected 143 diagnostic timestamps, got ${ordered.length}`);
for(const [index,time] of ordered.entries()){
 mixer.setTime(Math.min(time,clip.duration));scene.updateMatrixWorld(true);const sample={index,time_s:time,percent:time/clip.duration*100,hands:{}};
 for(const side of ['r','l']){
  const slot=scene.getObjectByName(`handslot${side}`),hand=scene.getObjectByName(`hand${side}`),{mesh,ids}=selected[side];mesh.skeleton.update();
  sample.hands[side]={slot_matrix:slot.matrixWorld.toArray(),hand_matrix:hand.matrixWorld.toArray(),surface_vertices:ids.map(id=>mesh.localToWorld(mesh.getVertexPosition(id,new THREE.Vector3())).toArray())};
 }
 samples.push(sample);
}
const result={asset:'gardener-v044-rig-medium.glb',sha256:createHash('sha256').update(bytes).digest('hex'),height:H,duration_s:clip.duration,samples,topology};
await mkdir('reviews/v044-rig-medium',{recursive:true});await writeFile('reviews/v044-rig-medium/native-samples.json.gz',gzipSync(JSON.stringify(result),{level:9}));
console.log(JSON.stringify({height:H,duration:clip.duration,samples:samples.length,vertices:Object.fromEntries(Object.entries(topology).map(([s,x])=>[s,x.vertex_ids.length])),triangles:Object.fromEntries(Object.entries(topology).map(([s,x])=>[s,x.triangles.length]))}));
