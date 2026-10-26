/** Read-only native glTF observations at the exact 143 baseline timestamps. */
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
globalThis.ProgressEvent ??= class { constructor(type,fields){Object.assign(this,{type},fields);} };
const out=resolve('reviews/digging-contact-diagnostic');
const modelPath='public/assets/kaykit-v045/character/KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb';
const toolsPath='public/assets/kaykit-v045/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_Tools.glb';
async function load(path){
 const bytes=await readFile(path),len=bytes.readUInt32LE(12);
 const doc=JSON.parse(bytes.subarray(20,20+len));
 const bin=bytes.subarray(28+len);
 const input=Buffer.from(JSON.stringify({...doc,materials:(doc.materials??[]).map(m=>({name:m.name})),images:[],textures:[],samplers:[]}));
 const json=Buffer.alloc(Math.ceil(input.length/4)*4,32);input.copy(json);
 const glb=Buffer.alloc(28+json.length+bin.length);
 glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);
 glb.writeUInt32LE(json.length,12);glb.writeUInt32LE(0x4e4f534a,16);json.copy(glb,20);
 glb.writeUInt32LE(bin.length,20+json.length);glb.writeUInt32LE(0x004e4942,24+json.length);bin.copy(glb,28+json.length);
 return {gltf:await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.length),''),doc,sha256:createHash('sha256').update(bytes).digest('hex')};
}
const ranger=await load(modelPath), tools=await load(toolsPath);
const scene=ranger.gltf.scene;scene.updateMatrixWorld(true);
const H=new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3()).y;
const clip=tools.gltf.animations.find(a=>a.name==='Digging');
const rows=(await readFile('reviews/digging-measures/ranger/frames.csv','utf8')).trim().split('\n').slice(1);
const times=rows.map(row=>Number(row.split(',')[0]));
if(times.length!==143)throw Error('The exact 143 baseline timestamps are required');
const arms={};const topology={};
for(const [side,name] of [['r','Ranger_ArmRight'],['l','Ranger_ArmLeft']]){
 const mesh=scene.getObjectByName(name),g=mesh.geometry;
 const handIndex=mesh.skeleton.bones.findIndex(b=>b.name===`hand${side}`);
 const ids=[];
 for(let i=0;i<g.attributes.position.count;i++){
  let weight=0;
  for(let j=0;j<4;j++)if(g.attributes.skinIndex.getComponent(i,j)===handIndex)weight+=g.attributes.skinWeight.getComponent(i,j);
  if(weight>=.5)ids.push(i);
 }
 const lookup=new Map(ids.map((id,i)=>[id,i])); const triangles=[];
 for(let i=0;i<g.index.count;i+=3){const tri=[0,1,2].map(j=>g.index.getX(i+j));if(tri.every(v=>lookup.has(v)))triangles.push(tri.map(v=>lookup.get(v)));}
 arms[side]={mesh,ids};topology[side]={mesh:name,selection:'All triangle vertices have weight hand >= 0.5; excludes forearm.',vertex_ids:ids,triangles};
}
const mixer=new THREE.AnimationMixer(scene),action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
const samples=[];
for(const [i,t] of times.entries()){
 mixer.setTime(Math.min(t,clip.duration));scene.updateMatrixWorld(true);
 const row={index:i,time_s:t,percent:Math.min(t/clip.duration*100,100),hands:{}};
 for(const side of ['r','l']){
  const slot=scene.getObjectByName(`handslot${side}`),hand=scene.getObjectByName(`hand${side}`);
  const {mesh,ids}=arms[side];mesh.skeleton.update();
  row.hands[side]={slot_matrix:slot.matrixWorld.toArray(),hand_matrix:hand.matrixWorld.toArray(),
   surface_vertices:ids.map(id=>mesh.localToWorld(mesh.getVertexPosition(id,new THREE.Vector3())).toArray())};
 }
 samples.push(row);
}
const result={coordinate_system:'native glTF, Y up, metres before studio normalization',height:H,duration_s:clip.duration,
 sources:{ranger:{path:modelPath,sha256:ranger.sha256},tools:{path:toolsPath,sha256:tools.sha256}},
 annotations_in_source:tools.doc.animations.find(a=>a.name==='Digging').extras??null,
 mesh_names:tools.doc.meshes.map(m=>m.name),topology,samples};
await mkdir(out,{recursive:true});await writeFile(`${out}/native-samples.json.gz`,gzipSync(JSON.stringify(result),{level:9}));
console.log(JSON.stringify({height:H,samples:samples.length,hand_triangles:Object.fromEntries(Object.entries(topology).map(([s,t])=>[s,t.triangles.length])),source_annotations:result.annotations_in_source},null,2));
