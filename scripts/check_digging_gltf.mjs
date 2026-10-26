/** Independent glTF runtime cross-check. Materials are stripped only in memory
 * because Node has no browser image loader; geometry/skin/animations unchanged.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

globalThis.ProgressEvent ??= class ProgressEvent { constructor(type, values) { Object.assign(this, { type }, values); } };
async function load(file) {
  const bytes = await readFile(file);
  const length = bytes.readUInt32LE(12);
  const doc = JSON.parse(bytes.subarray(20, 20 + length).toString());
  const bin = bytes.subarray(28 + length);
  doc.materials = (doc.materials ?? []).map(m => ({ name: m.name, pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1] } }));
  delete doc.images; delete doc.textures; delete doc.samplers;
  const text = Buffer.from(JSON.stringify(doc));
  const padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32); text.copy(padded);
  const out = Buffer.alloc(28 + padded.length + bin.length);
  out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
  out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);padded.copy(out,20);
  out.writeUInt32LE(bin.length,20+padded.length);out.writeUInt32LE(0x004e4942,24+padded.length);bin.copy(out,28+padded.length);
  return new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.length),'');
}
const base = resolve('public/assets/kaykit-v045');
const tools = await load(`${base}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_Tools.glb`);
const clip = tools.animations.find(a => a.name === 'Digging');
const reports = [];
for (const [name,path] of [['ranger',`${base}/character/KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb`],['v051',`${base}/gardener-v051.glb`]]) {
  const {scene} = await load(path);
  scene.updateMatrixWorld(true);
  const height = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3()).y;
  const right = scene.getObjectByName('handslotr');
  const left = scene.getObjectByName('handslotl');
  if (!right || !left) throw Error('Missing hand slots');
  const mixer = new THREE.AnimationMixer(scene);
  const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
  const rows=[];let fixed;
  for(let i=0;i<=100;i++) {
    mixer.setTime(clip.duration*i/100);scene.updateMatrixWorld(true);
    const p=left.getWorldPosition(new THREE.Vector3());
    const local=right.worldToLocal(p.clone());
    fixed ??= local.clone();
    rows.push({percent:i,time_s:clip.duration*i/100,left_relative_to_right:local.toArray(),
      left_frame_in_right:new THREE.Matrix4().copy(right.matrixWorld).invert().multiply(left.matrixWorld).toArray(),
      marker_error_H:local.distanceTo(fixed)/height,
      inter_hand_distance_H:p.distanceTo(right.getWorldPosition(new THREE.Vector3()))/height});
  }
  reports.push({name,height,duration_s:clip.duration,samples:rows.length,
    maximum_marker_error_H:Math.max(...rows.map(r=>r.marker_error_H)),
    inter_hand_distance_range_H:[Math.min(...rows.map(r=>r.inter_hand_distance_H)),Math.max(...rows.map(r=>r.inter_hand_distance_H))],
    rows});
}
await mkdir('reviews/digging-measures',{recursive:true});
await writeFile('reviews/digging-measures/gltf-cross-check.json',JSON.stringify(reports,null,2)+'\n');
console.log(JSON.stringify(reports.map(({rows,...r})=>r),null,2));
