import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import './style.css';
import { createFern } from './vegetation/fern';

type Style = 'lowpoly'|'organic'|'vector';
type Kind = 'tree'|'sapling'|'bush'|'flower'|'rock'|'pond'|'fern';
type Plant = {id:number;kind:Kind;x:number;z:number;seed:number};
const storageKey = 'komorebi-lab-v1';
// A composed reference garden, not a scattering of individual props.
// Distinct planting zones: northern grove, woodland edge, pond margin,
// flower meadow, and an open foreground. Coordinates remain editable.
const seedGarden: Plant[] = [
  {id:1,kind:'tree',x:-3.7,z:-3.5,seed:4}, // mature broadleaf, grove
  {id:2,kind:'tree',x:-1.6,z:-4.2,seed:5}, // light birch
  {id:3,kind:'tree',x:3.55,z:-3.45,seed:6}, // evergreen backdrop
  {id:4,kind:'sapling',x:4.35,z:-1.45,seed:7},
  {id:5,kind:'sapling',x:-4.15,z:-.65,seed:9},
  {id:6,kind:'bush',x:-3.45,z:-1.6,seed:25},
  {id:7,kind:'bush',x:-2.35,z:-2.15,seed:26},
  {id:8,kind:'bush',x:-4.25,z:1.35,seed:27},
  {id:9,kind:'bush',x:2.45,z:-3.9,seed:28},
  {id:10,kind:'bush',x:3.75,z:.75,seed:29},
  {id:11,kind:'bush',x:3.15,z:1.6,seed:30},
  {id:12,kind:'bush',x:1.85,z:3.55,seed:31},
  {id:13,kind:'flower',x:-3.8,z:2.35,seed:40},
  {id:14,kind:'flower',x:-3.05,z:2.75,seed:41},
  {id:15,kind:'flower',x:-2.3,z:3.15,seed:42},
  {id:16,kind:'flower',x:-1.85,z:3.95,seed:43},
  {id:17,kind:'flower',x:3.15,z:2.6,seed:44},
  {id:18,kind:'flower',x:3.9,z:2.3,seed:45},
  {id:19,kind:'flower',x:2.9,z:3.85,seed:46},
  {id:20,kind:'rock',x:-3.25,z:-4.75,seed:50},
  {id:21,kind:'rock',x:4.45,z:-3.15,seed:51},
  {id:22,kind:'rock',x:1.85,z:.95,seed:52},
  {id:23,kind:'pond',x:.65,z:-.45,seed:60},
];
let plants:Plant[] = load();
let style:Style='lowpoly';
let selected:Kind='tree';
let selectedSpeciesFamily:number|undefined;
let deleting=false;
let dense=false;
let nextId=Math.max(0,...plants.map(p=>p.id))+1;
const labels:Record<Kind,string>={tree:'Arbre',sapling:'Jeune arbre',bush:'Buisson',flower:'Fleurs',rock:'Rocher',pond:'Mare',fern:'Fougère'};
const ico:Record<Kind,string>={tree:'♠',sapling:'♣',bush:'✿',flower:'✳',rock:'◆',pond:'≈',fern:'❧'};
function load(){try{const v=JSON.parse(localStorage.getItem(storageKey)||'null'); if(Array.isArray(v)&&v.every(p=>typeof p.id==='number'&&typeof p.kind==='string'&&typeof p.x==='number'&&typeof p.z==='number'))return v as Plant[];}catch{}return seedGarden.map(p=>({...p}));}
function save(){localStorage.setItem(storageKey,JSON.stringify(plants));}
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<main class="garden-shell"><div id="viewport" class="viewport"><div id="scene"></div></div><nav class="hud hud-top"><div class="wordmark">木 <strong>Komorebi</strong></div><div class="hud-actions"><button id="home" title="Recentrer">⌖</button><button id="botany-open" title="Atelier botanique" aria-label="Ouvrir l’atelier botanique">✿</button><button id="density" title="Basculer la densité">♧</button><button id="focus" title="Masquer les commandes">◱</button><button id="menu-toggle" title="Ouvrir le menu">☰</button></div></nav><section id="build-panel" class="build-panel" aria-label="Outils du jardin"><div class="panel-top"><span>Construire</span><button id="erase" title="Supprimer un élément">✕ Effacer</button></div><div id="tools" class="tools"></div></section><aside id="menu-panel" class="menu-panel" hidden><h2>Komorebi</h2><p>Un jardin à composer librement.</p><button id="reset">↺ Restaurer le jardin</button><div id="counter"></div><div id="fps"></div><small id="scene-title">01 — Low-poly</small><p id="scene-description">Jardin miniature</p><small id="hint">Glisser : rotation · Molette : zoom · Clic : planter</small></aside><section id="botany" class="botany" hidden aria-label="Atelier botanique"><div class="botany-shell"><header class="botany-top"><div><small>ATELIER BOTANIQUE · ÉTUDE 01</small><h2>Les espèces du jardin</h2><p>Observer les formes, comparer les variantes, puis retourner composer.</p></div><button id="botany-close" title="Retourner au jardin">✕ &nbsp; Retour au jardin</button></header><div class="botany-body"><aside class="botany-list" id="botany-list"></aside><div class="botany-view"><div id="botany-canvas" class="botany-canvas"></div><div class="botany-variants" id="botany-variants"></div><div class="botany-help">Glisser pour tourner · Molette pour zoomer</div></div><aside class="botany-card"><small>FICHE D’ESPÈCE</small><h3 id="botany-name"></h3><p id="botany-desc"></p><div id="botany-facts"></div><button id="botany-plant">Choisir pour le jardin ↗</button><small>Étude visuelle · aucune progression ni ressource</small></aside></div></div></section><button id="build-toggle" class="build-toggle" title="Afficher les outils">✿</button></main>`;
const viewport=app.querySelector<HTMLDivElement>('#scene')!;
const tools=app.querySelector<HTMLDivElement>('#tools')!;
app.querySelector<HTMLButtonElement>('#menu-toggle')!.onclick=()=>{
 const panel=app.querySelector<HTMLElement>('#menu-panel')!;panel.hidden=!panel.hidden;
};
app.querySelector<HTMLButtonElement>('#focus')!.onclick=()=>app.classList.toggle('contemplation');
app.querySelector<HTMLButtonElement>('#build-toggle')!.onclick=()=>app.classList.toggle('tools-open');
(Object.keys(labels) as Kind[]).forEach(k=>{const btn=document.createElement('button');btn.dataset.kind=k;btn.innerHTML=`<span class="tool-icon">${ico[k]}</span><span>${labels[k]}</span>`;btn.onclick=()=>{selected=k;selectedSpeciesFamily=undefined;deleting=false;refreshUI();};tools.append(btn);});
let renderer:THREE.WebGLRenderer|undefined;
let scene:THREE.Scene|undefined;
let camera:THREE.OrthographicCamera|undefined;
let land:THREE.Mesh|undefined;
let objects:THREE.Group|undefined;
let request=0;
let yaw=Math.PI/4, pitch=.99, distance=16;
let dragging=false, moved=false, downX=0,downY=0;
let lastFrame=performance.now(),frames=0;
const mCache=new Map<string, THREE.MeshStandardMaterial>();
function mat(color:number,roughness=1){const key=`${color}-${roughness}`;let m=mCache.get(key);if(!m){m=new THREE.MeshStandardMaterial({color,roughness,flatShading:true});mCache.set(key,m);}return m;}
function shape(group:THREE.Group,geometry:THREE.BufferGeometry,color:number,x:number,y:number,z:number,rx=0,rz=0){const mesh=new THREE.Mesh(geometry,mat(color));mesh.position.set(x,y,z);mesh.rotation.set(rx,0,rz);mesh.castShadow=geometry.type === 'CylinderGeometry' || geometry.type === 'IcosahedronGeometry';mesh.receiveShadow=true;group.add(mesh);return mesh;}
function rand(seed:number,n:number){const v=Math.sin(seed*127.1+n*311.7)*43758.5453;return v-Math.floor(v);}
function tapered(group:THREE.Group,a:THREE.Vector3,b:THREE.Vector3,r0:number,r1:number,color:number,segments=6){const d=new THREE.Vector3().subVectors(b,a);const mesh=shape(group,new THREE.CylinderGeometry(r1,r0,d.length(),segments),color,0,0,0);mesh.position.copy(a).addScaledVector(d,.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return mesh;}
/**
 * A procedural flower can contain 40+ meshes; the GPU should not receive
 * a separate draw call for every petal or branch. Merge same-material
 * meshes within each plant while preserving the parent group's identity.
 * Mesh positions are baked in local space, so placement, scale and picking
 * continue to work as before.
 */
function batchPlant(group:THREE.Group):THREE.Group {
 const meshes=group.children.filter((child):child is THREE.Mesh => child instanceof THREE.Mesh);
 const groups=new Map<THREE.Material, THREE.Mesh[]>();
 for (const mesh of meshes) {
  const material=mesh.material;
  if (Array.isArray(material)) return group;
  const list=groups.get(material) ?? [];
  list.push(mesh);
  groups.set(material,list);
 }
 const combined:THREE.Mesh[]=[];
 const geometriesToDispose:THREE.BufferGeometry[]=[];
 try {
  for (const [material,list] of groups) {
   if(list.length===1){combined.push(list[0]);continue;}
   const geometries=list.map(mesh=>{
    mesh.updateMatrix();
    const source=mesh.geometry;
    const copy=source.index ? source.toNonIndexed() : source.clone();
    copy.applyMatrix4(mesh.matrix);
    return copy;
   });
   const merged=mergeGeometries(geometries,false);
   for(const geometry of geometries)geometry.dispose();
   if(!merged)throw new Error('Unable to merge plant geometry');
   geometriesToDispose.push(merged);
   const mesh=new THREE.Mesh(merged,material);
   mesh.castShadow=list.some(item=>item.castShadow);
   mesh.receiveShadow=list.some(item=>item.receiveShadow);
   mesh.userData.id=group.userData.id;
   combined.push(mesh);
  }
 }catch(error){
  geometriesToDispose.forEach(geometry=>geometry.dispose());
  console.warn('Geometry batching skipped for this plant',error);
  return group;
 }
 const retained=new Set(combined);
 for(const mesh of meshes){if(!retained.has(mesh))mesh.geometry.dispose();}
 group.clear();
 combined.forEach(mesh=>group.add(mesh));
 return group;
}

function buildPlant(p:Plant){
 const g=new THREE.Group();g.position.set(p.x,groundHeight(p.x,p.z),p.z);g.userData.id=p.id;
 const r=(n:number)=>rand(p.seed,n);
 if(p.kind==='tree'||p.kind==='sapling'){
  const young=p.kind==='sapling';
  g.scale.setScalar(young?.62:1);
  const species=p.seed%4;
  const lean=(r(1)-.5)*.16;
  const trunk=species===1?0xc9c2ac:species===2?0x6f624c:0x796448;
  const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
  if(species===0){ // An open broadleaf canopy: irregular lobes, visible branching and a coherent crown.
   const crown=[0x426d3d,0x5a8645,0x739851,0x88a656,0x9bb25d,0x658c49];
   const canopyY=2.15+r(2)*.15;
   tapered(g,v(0,0,0),v(lean,1.63,0),.25,.13,trunk,7);
   for(let i=0;i<9;i++){
    const a=i*2.399963+(r(i+7)-.5)*.32;
    const radius=.76+.46*r(i+11), x=lean+Math.cos(a)*radius,z=Math.sin(a)*radius*.83;
    const y=canopyY+(r(i+19)-.5)*.55;
    const branchTip=v(x*.83,y-.14,z*.83);
    tapered(g,v(lean,1.29,0),branchTip,.088,.028,trunk,5);
    const lobe=shape(g,new THREE.IcosahedronGeometry(.55+.18*r(i+28),1),crown[(i+Math.floor(r(i+30)*3))%crown.length],x,y,z);
    lobe.scale.set(1.03+.24*r(i+32),.58+.19*r(i+36),.87+.20*r(i+40));
    lobe.rotation.y=a;lobe.castShadow=true;
   }
   for(let i=0;i<3;i++){
    const a=i*2.1+1.4;
    const lobe=shape(g,new THREE.IcosahedronGeometry(.60+.08*r(i+54),1),crown[(i+3)%crown.length],lean+Math.cos(a)*.38,2.48+r(i+57)*.22,Math.sin(a)*.33);
    lobe.scale.set(1.02,.68,.93);lobe.castShadow=true;
   }
  }else if(species===1){ // Birch: visible light trunk and separate airy sprays.
   tapered(g,v(0,0,0),v(lean,2.7,0),.16,.065,trunk,7);
   for(let i=0;i<4;i++){
    const a=i*2.4,reach=.50+r(50+i)*.33;
    const x=lean+Math.cos(a)*reach,z=Math.sin(a)*reach*.85;
    const h=1.62+i*.28;
    tapered(g,v(lean,h-.53,0),v(x,h+.27,z),.055,.012,0x9e9682,5);
    const crown=shape(g,new THREE.IcosahedronGeometry(.49+r(i+60)*.14,1),
      [0x7b9c59,0x9eb873,0x739c55,0xa9bd7b][i],x,h+.32,z);
    crown.scale.set(.72,1.28,.75);
   }
   const top=shape(g,new THREE.IcosahedronGeometry(.53,1),0x91b06e,lean,2.75,0);
   top.scale.set(.70,1.25,.72);
   for(let i=0;i<4;i++){
    const bark=shape(g,new THREE.BoxGeometry(.15,.035,.025),0x827e71,
      lean+(i%2?-.025:.03),.44+i*.45,.12);
    bark.castShadow=false;
   }
  }else if(species===2){ // Pine: staggered conical whorls with the trunk below.
   tapered(g,v(0,0,0),v(lean,3.12,0),.22,.045,trunk,7);
   for(let i=0;i<4;i++){
    const y=1.17+i*.51;
    const tier=shape(g,new THREE.ConeGeometry(1.08-i*.19,.98,7,1),
      [0x345f43,0x416e48,0x507c4a,0x638c53][i],lean,y,0);
    tier.scale.z=.89;
    tier.rotation.y=.24+i*.22;
   }
   const tip=shape(g,new THREE.ConeGeometry(.30,.65,7),0x628a52,lean,3.04,0);
   tip.rotation.y=.3;
  }else{ // Cypress: slender, tall and clustered but not a green column.
   tapered(g,v(0,0,0),v(lean,3.04,0),.14,.038,trunk,6);
   for(let i=0;i<5;i++){
    const y=.94+i*.46;
    const crown=shape(g,new THREE.IcosahedronGeometry(.38-i*.024,1),
      [0x2f6044,0x3b7047,0x457a49,0x4e8250,0x628b55][i],lean,y,0);
    crown.scale.set(.83,1.30,.78);
   }
   const tip=shape(g,new THREE.ConeGeometry(.20,.57,7),0x53864f,lean,3.14,0);
   tip.rotation.y=.33;
  }
 }
 if(p.kind==='fern'){
  const fern=createFern(p.seed);
  for(const child of [...fern.children])g.add(child);
 }
 if(p.kind==='bush'){
  const num=6+Math.floor(r(3)*3);
  const greens=[0x477940,0x619250,0x7da560,0x527e45,0x8eac68];
  for(let i=0;i<num;i++){
   const a=i*2.399+ r(i+31)*.18,rad=.21+.19*r(i);
   const x=Math.cos(a)*rad,z=Math.sin(a)*rad;
   const radius=.23+r(i+6)*.15;
   const ball=shape(g,new THREE.IcosahedronGeometry(radius,1),greens[(i+p.seed)%greens.length],x,.26+r(i+9)*.18,z);
   ball.scale.set(1.15,.65+r(i+10)*.26,.95);ball.castShadow=true;
  }
  // Basal leaves ground the shrub and break up the spherical silhouette.
  for(let i=0;i<12;i++){
   const a=i*2.399+ r(i+60)*.15,rad=.3+r(i+61)*.28;
   const leaf=shape(g,new THREE.IcosahedronGeometry(.13+r(i+63)*.06,0),greens[i%greens.length],Math.cos(a)*rad,.09,Math.sin(a)*rad);
   leaf.scale.set(.82,.24,1.38);leaf.rotation.y=a;leaf.castShadow=false;
  }
 }
 if(p.kind==='flower'){
  const count=8;for(let i=0;i<count;i++){const a=i*2.399,rad=.13+.37*r(i),x=Math.cos(a)*rad,z=Math.sin(a)*rad,h=.25+.23*r(i+12);tapered(g,new THREE.Vector3(x,0,z),new THREE.Vector3(x+.04,h,z),.016,.008,0x527d49,5);
   for(let side of [-1,1]){
    const leaf=shape(g,new THREE.IcosahedronGeometry(.10+r(i+71)*.03,0),side===1?0x5b944a:0x75a35d,x+side*.085,.12+r(i+72)*.08,z+side*.07);
    leaf.scale.set(.65,.25,1.45);leaf.rotation.y=side*.45+i*.35;leaf.castShadow=false;
   }
   const color=[0xeedba8,0xe8b1a1,0xc7bbdf,0xf2eee0][(i+p.seed)%4];for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;const petal=shape(g,new THREE.IcosahedronGeometry(.078,0),color,x+.04+Math.cos(angle)*.067,h,z+Math.sin(angle)*.067);petal.scale.set(.8,.48,1.2);}shape(g,new THREE.IcosahedronGeometry(.035,0),0xd7ab53,x+.04,h,z);
  }
 }
 if(p.kind==='rock'){const rock=shape(g,new THREE.DodecahedronGeometry(.45+r(2)*.19,0),0x969590,0,.3,0);rock.scale.set(1.3,.65,.85);rock.rotation.y=r(4)*6.28;}
 if(p.kind==='pond'){
  // Irregular, gently stepped shoreline. The water is framed by vegetation and a
  // low earth transition instead of a raised circular stone rim.
  const steps=32;
  const perimeter=(i:number,scale:number)=>{
   const a=i*Math.PI*2/steps;
   const r=(1.07+.105*Math.sin(a*3+.3)+.06*Math.cos(a*7-.4))*scale;
   return {x:Math.cos(a)*r,z:Math.sin(a)*r*.8};
  };
  const disk=(scale:number,y:number,color:number)=>{
   const verts:number[]=[0,y,0],indices:number[]=[];
   for(let i=0;i<=steps;i++){const q=perimeter(i,scale);verts.push(q.x,y,q.z);if(i<steps)indices.push(0,i+2,i+1);}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();
   const mesh=shape(g,geo,color,0,0,0);mesh.castShadow=false;return mesh;
  };
  const bank=(inner:number,outer:number,low:number,high:number,color:number)=>{
   const verts:number[]=[],indices:number[]=[];
   for(let i=0;i<=steps;i++){
    const a=perimeter(i,inner),b=perimeter(i,outer);
    verts.push(a.x,low,a.z,b.x,high,b.z);
    if(i<steps){const v=i*2;indices.push(v,v+2,v+1,v+1,v+2,v+3);}
   }
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();
   const mesh=shape(g,geo,color,0,0,0);mesh.castShadow=false;mesh.receiveShadow=false;
  };
  disk(1.30,.055,0x77965d);
  bank(1.06,1.29,.18,.055,0x87a66d);
  disk(1.07,.18,0x609d9a);
  disk(.98,.185,0x8bc8b8);
  // Subtle surface glaze: avoid a featureless solid disk.
  const glazeGeometry=new THREE.CircleGeometry(.76,40);
  glazeGeometry.rotateX(-Math.PI/2);
  const glaze=new THREE.Mesh(glazeGeometry,new THREE.MeshBasicMaterial({color:0xd4e9c8,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide}));
  glaze.scale.set(1.1,1,.78);glaze.position.set(-.08,.188,-.07);
  glaze.castShadow=false;glaze.receiveShadow=false;g.add(glaze);
  for(let k=0;k<2;k++){
   const ripple=new THREE.Mesh(new THREE.RingGeometry(.20+k*.13,.211+k*.13,38,1,0,Math.PI*1.45),new THREE.MeshBasicMaterial({color:0xdcefe0,transparent:true,opacity:.65-k*.13,side:THREE.DoubleSide,depthWrite:false}));
   ripple.rotation.x=-Math.PI/2;ripple.rotation.z=k*.9;
   ripple.position.set(-.20+k*.44,.193+k*.001,.08-k*.24);
   ripple.scale.y=.82;ripple.castShadow=false;g.add(ripple);
  }
  // Small natural bankside clusters, leaving most shoreline open.
  for(let i=0;i<12;i++){
   const a=i*2.399,rad=1.20+.13*r(i+10),x=Math.cos(a)*rad,z=Math.sin(a)*rad*.8;
   if(i%3===0){
    const rock=shape(g,new THREE.DodecahedronGeometry(.09+.065*r(i+20),0),i%2?0xa9ac94:0x858f79,x,.18,z);
    rock.scale.set(1.35,.43,.86);rock.castShadow=false;
   }else{
    for(let j=0;j<3;j++){
     const lean=(j-1)*.09;
     tapered(g,new THREE.Vector3(x,0,z),new THREE.Vector3(x+lean,.24+.15*r(i+j+30),z+.06),.012,.003,0x53794e,4);
    }
   }
  }
  // Water lily leaves sit just above the pool and do not cast hard shadows.
  for(let i=0;i<3;i++){
   const a=i*2.35+.4,rr=.32+.29*r(i+50),x=Math.cos(a)*rr,z=Math.sin(a)*rr*.75;
   const leaf=shape(g,new THREE.CylinderGeometry(.13,.13,.012,7),i===1?0x668d53:0x729d5b,x,.20,z);
   leaf.scale.z=.78;leaf.rotation.y=a;leaf.castShadow=false;
  }
 }
 g.traverse((obj:THREE.Object3D)=>{if(obj instanceof THREE.Mesh)obj.userData.id=p.id;});return batchPlant(g);
}
function groundHeight(x:number,z:number){
 const base=.13*Math.sin(x*.6+.5)*Math.cos(z*.7)+.075*Math.sin(x*1.4+z*.9)+.035*Math.cos(z*2.1-x*.5);
 let hollow=0;
 for(const pond of plants){if(pond.kind!=='pond')continue;
  const dx=x-pond.x,dz=(z-pond.z)/.8, d=Math.sqrt(dx*dx+dz*dz);
  const t=THREE.MathUtils.clamp((1.44-d)/.42,0,1);
  hollow=Math.max(hollow,.23*t*t*(3-2*t));
 }
 return base-hollow;
}
function addLandscape(world:THREE.Scene){
 const groundGeo=new THREE.PlaneGeometry(11,11,64,64);groundGeo.rotateX(-Math.PI/2);
 const pos=groundGeo.getAttribute('position');const colors:number[]=[];
 const moss=new THREE.Color(0x628e43),meadow=new THREE.Color(0x91b96a),warm=new THREE.Color(0xaecb76);
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,groundHeight(x,z));
  const t=.5+.20*Math.sin(x*1.05+z*.75)+.13*Math.cos(z*1.63-x*.48)+.08*Math.sin(x*2.8-z*3.1);
  const color=moss.clone().lerp(meadow,THREE.MathUtils.clamp(t,0,1));
  color.lerp(warm,.14*Math.max(0,Math.sin(z*1.9+x*.7)));
  colors.push(color.r,color.g,color.b);
 }
 groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));groundGeo.computeVertexNormals();
 land=new THREE.Mesh(groundGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));land.receiveShadow=true;world.add(land);
 // Earth underneath the grassy terrain: it gives the diorama an actual cutaway edge.
 const earth=new THREE.Mesh(new THREE.BoxGeometry(11,.8,11),mat(0x776c50));earth.position.y=-.51;earth.receiveShadow=true;world.add(earth);
 const lip=new THREE.Mesh(new THREE.BoxGeometry(11,.12,11),mat(0x596c48));lip.position.y=-.14;world.add(lip);
 // An informal footpath: small, irregular stones in a gently meandering strip.
 // Two instanced materials keep it inexpensive even as the garden grows.
 const pathGeo=new THREE.DodecahedronGeometry(1,0);
 const pathPalette=[0xc4bdb0,0xa5a39b];
 for(let tone=0;tone<2;tone++){
  const count=21;
  const pathMesh=new THREE.InstancedMesh(pathGeo,mat(pathPalette[tone]),count);
  const transform=new THREE.Object3D();
  pathMesh.castShadow=false;
  pathMesh.receiveShadow=true;
  for(let i=0;i<count;i++){
   const step=i*2+tone;
   const z=-4.9+step*.24;
   const x=-1.30+.29*Math.sin(step*.23)+.13*Math.sin(step*.72)+(rand(step,74)-.5)*.28;
   const radius=.13+.085*rand(step,76);
   transform.position.set(x,groundHeight(x,z)+.025,z);
   transform.rotation.set(0,rand(step,77)*Math.PI,0);
   transform.scale.set(radius*(1.1+rand(step,78)*.5),.035+rand(step,79)*.025,radius*(.9+rand(step,80)*.5));
   transform.updateMatrix();
   pathMesh.setMatrixAt(i,transform.matrix);
  }
  pathMesh.instanceMatrix.needsUpdate=true;
  world.add(pathMesh);
 }
 // Deliberately clean grass: no triangular noise from blade meshes.
 const dummy=new THREE.Object3D(),color=new THREE.Color();
 // Low, recognizable fern fronds instead of the former dark miniature cones.
 // Each frond is a flat, faceted taper with a central ridge; all fronds share
 // a single instanced draw call. Place them in gentle colonies, not white noise.
 const fernVertices:number[]=[];
 const leafSegments=5;
 for(let k=0;k<leafSegments;k++){
  const t0=k/leafSegments,t1=(k+1)/leafSegments;
  const width=(t:number)=>.10*Math.sin(Math.PI*(.09+.91*t));
  const edge=(t:number,side:number)=>new THREE.Vector3(side*width(t),.015+.30*t-.055*t*t,.39*t);
  const ridge=(t:number)=>new THREE.Vector3(0,.05+.37*t-.075*t*t,.39*t);
  const a=ridge(t0),b=ridge(t1);
  for(const side of [-1,1]){
   const c=edge(t0,side),d=edge(t1,side);
   for(const v of [a,c,d,a,d,b])fernVertices.push(v.x,v.y,v.z);
  }
 }
 const fernGeometry=new THREE.BufferGeometry();
 fernGeometry.setAttribute('position',new THREE.Float32BufferAttribute(fernVertices,3));
 fernGeometry.computeVertexNormals();
 const fernMaterial=new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:1,flatShading:true});
 const colonies=[[-3.8,-2.6],[-2.9,2.7],[3.6,-3.1],[3.7,2.9],[-3.6,.3],[2.9,.2],[-.1,3.5]];
 const frondsPerColony=23;
 const ferns=new THREE.InstancedMesh(fernGeometry,fernMaterial,colonies.length*frondsPerColony);
 ferns.castShadow=false;ferns.receiveShadow=false;
 let fernIndex=0;
 for(let colony=0;colony<colonies.length;colony++){
  const [cx,cz]=colonies[colony];
  for(let i=0;i<frondsPerColony;i++){
   const a=i*2.39996+rand(colony,85),spread=.12+Math.sqrt(rand(i+colony*31,86))*.82;
   const x=cx+Math.cos(a)*spread,z=cz+Math.sin(a)*spread;
   // Keep a natural clearing around the pond and stepping-stone path.
   if(Math.hypot(x-.3,(z-.2)/.8)<1.5 || (Math.abs(x+.9)<.45 && Math.abs(z)<4.6)){
    dummy.scale.set(.001,.001,.001);
   }else{
    dummy.scale.set(.65+rand(i,87)*.65,.65+rand(i+colony,88)*.6,.7+rand(i,89)*.7);
   }
   dummy.position.set(x,groundHeight(x,z)-.008,z);
   dummy.rotation.set(0,a+(rand(i,90)-.5)*.4,0);
   dummy.updateMatrix();ferns.setMatrixAt(fernIndex,dummy.matrix);
   color.setHex([0x4b794b,0x62864e,0x799858,0x547e49,0x89a365][(i+colony)%5]);
   ferns.setColorAt(fernIndex,color);fernIndex++;
  }
 }
 ferns.instanceMatrix.needsUpdate=true;
 if(ferns.instanceColor)ferns.instanceColor.needsUpdate=true;
 world.add(ferns);

 // Small clusters of stones ground the trees in the landscape.
 const pebbles=new THREE.Group();for(let i=0;i<34;i++){
  const x=(rand(i,30)-.5)*9.8,z=(rand(i,31)-.5)*9.8;
  if(Math.abs(x+.9)<.55)continue;
  const stone=shape(pebbles,new THREE.DodecahedronGeometry(.08+.08*rand(i,32),0),i%3?0x899587:0xa3a597,x,groundHeight(x,z)+.035,z);
  stone.scale.set(1,.45,1.2);stone.rotation.y=rand(i,34)*6.28;stone.castShadow=false;
 }world.add(pebbles);
}
function init3d(){renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.34;viewport.append(renderer.domElement);scene=new THREE.Scene();scene.background=new THREE.Color('#e9e9d8');camera=new THREE.OrthographicCamera(-8,8,5,-5,.1,100);scene.add(new THREE.HemisphereLight(0xfff7df,0x99917c,2.22));const sun=new THREE.DirectionalLight(0xffeccb,1.18);sun.position.set(-4,11,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.normalBias=.025;sun.shadow.radius=4;sun.shadow.blurSamples=12;sun.shadow.intensity=.48;scene.add(sun);addLandscape(scene);objects=new THREE.Group();scene.add(objects);refreshPlants3d();resize();updateCamera();renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('wheel',wheel,{passive:false});loop();}
function refreshPlants3d(){if(!objects)return;while(objects.children.length){const child=objects.children[0];objects.remove(child);child.traverse((obj:THREE.Object3D)=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();/* shared materials are cached; only geometry is per object */}});}if(land){const geo=land.geometry;const position=geo.getAttribute('position');
 for(let i=0;i<position.count;i++)position.setY(i,groundHeight(position.getX(i),position.getZ(i)));
 position.needsUpdate=true;geo.computeVertexNormals();}
 plants.forEach(p=>objects!.add(buildPlant(p)));}
function updateCamera(){if(!camera)return;camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(0,0,0);camera.updateProjectionMatrix();}
function resize(){
 const w=Math.round(viewport.getBoundingClientRect().width);
 const h=Math.round(viewport.getBoundingClientRect().height);
 if(!renderer||!camera||w<2||h<2)return;
 const span=7.25;
 camera.left=-span*w/h;
 camera.right=span*w/h;
 camera.top=span;
 camera.bottom=-span;
 camera.updateProjectionMatrix();
 renderer.setSize(w,h,false);
 renderer.domElement.style.width=`${w}px`;
 renderer.domElement.style.height=`${h}px`;
}
const sceneResizeObserver=new ResizeObserver(()=>resize());
sceneResizeObserver.observe(viewport);
function loop(){request=requestAnimationFrame(loop);if(renderer && (Math.abs(renderer.domElement.clientWidth-viewport.clientWidth)>2 || Math.abs(renderer.domElement.clientHeight-viewport.clientHeight)>2))resize();renderer?.render(scene!,camera!);frames++;const now=performance.now();if(now-lastFrame>1000){app.querySelector('#fps')!.textContent=`${Math.round(frames*1000/(now-lastFrame))} FPS · ${renderer?.info.render.calls ?? 0} appels GPU`;frames=0;lastFrame=now;}}
function pointerDown(e:PointerEvent){dragging=true;moved=false;downX=e.clientX;downY=e.clientY;(e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);}
function pointerMove(e:PointerEvent){if(!dragging)return;const dx=e.clientX-downX,dy=e.clientY-downY;if(Math.abs(dx)+Math.abs(dy)>3)moved=true;if(moved){yaw-=dx*.008;pitch=Math.max(.35,Math.min(1.5,pitch+dy*.006));updateCamera();}downX=e.clientX;downY=e.clientY;}
const raycaster=new THREE.Raycaster();const mouse=new THREE.Vector2();
function pointerUp(e:PointerEvent){if(!dragging)return;dragging=false;if(moved||!camera||!scene||!land||!renderer)return;const rect=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);const hits=raycaster.intersectObjects(objects!.children,true);if(deleting){const id=hits[0]?.object.userData.id as number|undefined;if(id!==undefined){plants=plants.filter(p=>p.id!==id);changed();}return;}const h=raycaster.intersectObject(land)[0];if(h && Math.abs(h.point.x)<5.25 && Math.abs(h.point.z)<5.25){const seed=selectedSpeciesFamily!==undefined&&(selected==='tree'||selected==='sapling')?nextId*4+selectedSpeciesFamily:nextId;plants.push({id:nextId++,kind:selected,x:Math.round(h.point.x*4)/4,z:Math.round(h.point.z*4)/4,seed});changed();}}
function wheel(e:WheelEvent){e.preventDefault();if(!camera)return;camera.zoom=Math.max(.65,Math.min(2.5,camera.zoom*(e.deltaY>0?.9:1.1)));camera.updateProjectionMatrix();}
function project(x:number,z:number){return {x:400+(x-z)*25,y:233+(x+z)*18};}
function svgPlant(p:Plant){const q=project(p.x,p.z),x=q.x,y=q.y;const ss=Math.sin(p.seed*4)*.17;const wrap=(s:string)=>`<g data-id="${p.id}" transform="translate(${x} ${y})">${s}</g>`;
 if(p.kind==='tree'||p.kind==='sapling'){const s=p.kind==='sapling'?.65:1;return wrap(`<g transform="scale(${s})"><ellipse cy="5" rx="32" ry="11" fill="#77916f" opacity=".24"/><path d="M-7 0 Q-9 -38 -4 -68 L7 -68 Q8 -34 8 0Z" fill="#94785b"/><path d="M-4 -38 Q-28 -62 -29 -77 M4 -49 Q24 -73 25 -86" fill="none" stroke="#94785b" stroke-width="6" stroke-linecap="round"/><path d="M-42 -78 Q-58 -106 -28 -123 Q-21 -151 12 -136 Q44 -154 51 -114 Q67 -86 37 -71 Q14 -55 -6 -67 Q-31 -56 -42 -78Z" fill="${ss>0?'#82a477':'#749a6d'}"/><path d="M-31 -111 Q-18 -140 15 -129 M8 -88 Q33 -109 43 -92" fill="none" stroke="#b4caa0" stroke-width="4" opacity=".52"/></g>`);}
 if(p.kind==='bush')return wrap(`<ellipse cy="5" rx="29" ry="9" fill="#709368" opacity=".22"/><path d="M-34 0 Q-45 -25 -22 -33 Q-13 -51 4 -35 Q24 -50 30 -27 Q45 -13 31 0Z" fill="#70975e"/><path d="M-25 -13 Q-15 -31 -5 -20 M10 -22 Q22 -34 28 -16" fill="none" stroke="#a7be83" stroke-width="3"/>`);
 if(p.kind==='flower')return wrap(Array.from({length:8},(_,i)=>{const a=i*2.4,cx=Math.cos(a)*(12+i%3*6),cy=Math.sin(a)*7;return `<path d="M${cx} 0 Q${cx-3} -10 ${cx} ${cy-20}" stroke="#618d62" stroke-width="2" fill="none"/><circle cx="${cx}" cy="${cy-20}" r="7" fill="${['#eabcb4','#f4d895','#d0c4e5'][i%3]}"/><circle cx="${cx}" cy="${cy-20}" r="2" fill="#c79f48"/>`;}).join(''));
 if(p.kind==='rock')return wrap(`<path d="M-32 0 L-23 -19 L8 -28 L30 -14 L34 0 L7 9Z" fill="#9ba9a0"/><path d="M-23 -19 L8 -28 L9 -4 L-3 6 L-32 0Z" fill="#bfc8ba"/>`);
 return wrap(`<ellipse rx="57" ry="25" fill="#8dab9f"/><ellipse rx="53" ry="21" fill="#89c6c1"/><path d="M-33 -4 Q-11 -14 15 -4" fill="none" stroke="#d1ebe2" stroke-width="3" opacity=".7"/>`);
}
function initVector(){const root=document.createElement('div');root.className='vector-stage';root.innerHTML='<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Jardin vectoriel interactif"><defs><filter id="shadow"><feGaussianBlur stdDeviation="5"/></filter></defs><rect width="800" height="600" fill="#e1e9d9"/><path d="M400 35 L675 235 L400 440 L125 235Z" fill="#849d7a" opacity=".35" transform="translate(4 12)"/><path d="M400 35 L675 235 L400 440 L125 235Z" fill="#b8cda3"/><g id="plants-svg"></g></svg>';viewport.append(root);const svg=root.querySelector('svg')!;let dx=0,dy=0,drag=false;svg.addEventListener('pointerdown',e=>{dx=e.clientX;dy=e.clientY;drag=false;svg.setPointerCapture(e.pointerId);});svg.addEventListener('pointermove',e=>{if(Math.abs(e.clientX-dx)+Math.abs(e.clientY-dy)>5)drag=true;});svg.addEventListener('pointerup',e=>{if(drag)return;const t=e.target as Element;const node=t.closest('[data-id]');if(deleting){if(node){plants=plants.filter(p=>p.id!==Number(node.getAttribute('data-id')));changed();}return;}const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const m=svg.getScreenCTM();if(!m)return;const at=pt.matrixTransform(m.inverse());const a=(at.x-400)/25,b=(at.y-233)/18;const x=(a+b)/2,z=(b-a)/2;if(Math.abs(x)<4.9&&Math.abs(z)<4.9){plants.push({id:nextId++,kind:selected,x:Math.round(x*4)/4,z:Math.round(z*4)/4,seed:nextId});changed();}});refreshVector();}
function refreshVector(){const group=viewport.querySelector('#plants-svg');if(group)group.innerHTML=[...plants].sort((a,b)=>(a.x+a.z)-(b.x+b.z)).map(svgPlant).join('');}
function dispose(){cancelAnimationFrame(request);renderer?.domElement.removeEventListener('pointerdown',pointerDown);renderer?.domElement.removeEventListener('pointermove',pointerMove);renderer?.domElement.removeEventListener('pointerup',pointerUp);renderer?.domElement.removeEventListener('wheel',wheel);renderer?.dispose();renderer=undefined;camera=undefined;scene=undefined;objects=undefined;land=undefined;viewport.replaceChildren();app.querySelector('#fps')!.textContent='— FPS';}
function changed(){save();if(style==='vector')refreshVector();else refreshPlants3d();refreshUI();}
function refreshUI(){app.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(b=>b.classList.toggle('active',b.dataset.style===style));app.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(b=>{b.classList.toggle('active',!deleting&&b.dataset.kind===selected);b.title=b.dataset.kind===selected&&selectedSpeciesFamily!==undefined&&selected==='tree'?['Chêne','Bouleau','Conifère','Cyprès'][selectedSpeciesFamily]:'Sélectionner';});app.querySelector('#erase')!.classList.toggle('active',deleting);app.querySelector('#counter')!.textContent=`${plants.length} éléments · sauvegarde locale`;app.querySelector('#scene-title')!.textContent=style==='lowpoly'?'01 — Low-poly':style==='organic'?'02 — Organique':'03 — Vectoriel';app.querySelector('#scene-description')!.textContent=style==='lowpoly'?'Des volumes francs, une nature simple et lumineuse.':style==='organic'?'Des volumes adoucis, une végétation plus généreuse.':'Des formes illustrées et des couleurs en aplats.';app.querySelector('#hint')!.textContent=style==='vector'?'Clic pour planter · Cliquez sur un élément pour le supprimer':'Glisser pour tourner · Molette pour zoomer · Clic pour planter';app.querySelector('#density')!.textContent=dense?'− Jardin épuré':'＋ Jardin dense';}
function changeStyle(s:Style){if(style===s)return;dispose();style=s;if(s==='vector')initVector();else init3d();refreshUI();}
app.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(b=>b.onclick=()=>changeStyle(b.dataset.style as Style));
app.querySelector<HTMLButtonElement>('#erase')!.onclick=()=>{deleting=!deleting;refreshUI();};
app.querySelector<HTMLButtonElement>('#reset')!.onclick=()=>{plants=seedGarden.map(p=>({...p}));dense=false;nextId=Math.max(0,...plants.map(p=>p.id))+1;changed();};
app.querySelector<HTMLButtonElement>('#home')!.onclick=()=>{yaw=Math.PI/4;pitch=.89;if(camera)camera.zoom=1;updateCamera();};
app.querySelector<HTMLButtonElement>('#density')!.onclick=()=>{dense=!dense;if(dense){for(let i=0;i<110;i++){
  // Dense planting happens in woodland edges and meadow beds, not uniformly.
  const a=i*2.399963229728653, ring=Math.sqrt((i%37)/37);
  const zones=[[-3.15,-2.6,1.45],[3.25,-2.4,1.30],[-2.75,3.05,1.35],[3.05,2.95,1.25]];
  const [cx,cz,radius]=zones[i%zones.length];
  const x=Math.max(-4.8,Math.min(4.8,cx+Math.cos(a)*ring*radius));
  const z=Math.max(-4.8,Math.min(4.8,cz+Math.sin(a)*ring*radius));
  // Keep broadleaf saplings sparse; crowding the water hid the shoreline.
  const kind:Kind=i%23===0?'sapling':i%17===0?'rock':i%4===0?'bush':'flower';
  // Leave a breathing area around the pond and its nearest paths.
  if(Math.hypot(x-.65,z+.45)<1.65)continue;
  plants.push({id:nextId++,kind,x,z,seed:i+100});
 }}else{plants=plants.filter(p=>p.seed<100);}changed();};
// Botanical workshop: isolated renderer, same procedural plant builders as the garden.
// Species records specify the seed family; variations change only the procedural seed.
type SpeciesRecord={id:string;name:string;group:string;kind:Kind;family:number;description:string;habitat:string};
const speciesCatalog:SpeciesRecord[]=[
 {id:'oak',name:'Chêne',group:'Arbres',kind:'tree',family:0,description:'Large houppier asymétrique et branches étalées. Une silhouette qui structure le jardin.',habitat:'Boisement · mi-ombre'},
 {id:'birch',name:'Bouleau',group:'Arbres',kind:'tree',family:1,description:'Tronc clair, feuillage léger et couronne plus aérée.',habitat:'Lisière · soleil'},
 {id:'pine',name:'Conifère',group:'Arbres',kind:'tree',family:2,description:'Une silhouette verticale et persistante, plus graphique que les feuillus.',habitat:'Sol drainé · soleil'},
 {id:'cypress',name:'Cyprès',group:'Arbres',kind:'tree',family:3,description:'Une ponctuation étroite et élancée pour rythmer la composition.',habitat:'Sol drainé · soleil'},
 {id:'young',name:'Jeune arbre',group:'Arbres',kind:'sapling',family:1,description:'Une déclinaison plus petite des arbres, parfaite en bordure de bosquet.',habitat:'Lisière'},
 {id:'shrub',name:'Arbuste',group:'Sous-bois',kind:'bush',family:0,description:'Masses arrondies et feuillage dense pour relier arbres et prairie.',habitat:'Lisière · sous-bois'},
 {id:'fern',name:'Fougère',group:'Sous-bois',kind:'fern',family:0,description:'Frondes arquées et folioles étagées. La silhouette du sous-bois.',habitat:'Sol frais · mi-ombre'},
 {id:'flower',name:'Fleurs sauvages',group:'Prairie',kind:'flower',family:0,description:'Petites floraisons claires rassemblées en touffes naturelles.',habitat:'Prairie · soleil'},
 {id:'rock',name:'Roche',group:'Minéraux',kind:'rock',family:0,description:'Pierre facettée aux volumes simples et aux teintes minérales.',habitat:'Partout'},
 {id:'pond',name:'Mare',group:'Eau',kind:'pond',family:0,description:'Une surface d’eau calme aux berges irrégulières.',habitat:'Terrain humide'},
];
const botanyPanel=app.querySelector<HTMLElement>('#botany')!;
const botanicalList=app.querySelector<HTMLElement>('#botany-list')!;
const variantBar=app.querySelector<HTMLElement>('#botany-variants')!;
let botanicalSpecies=speciesCatalog[0],botanicalVariant=0;
let botanicalRenderer:THREE.WebGLRenderer|undefined,botanicalScene:THREE.Scene|undefined,botanicalCamera:THREE.PerspectiveCamera|undefined,botanicalGroup:THREE.Group|undefined;
let botanicalAzimuth=.66, botanicalElevation=.36, botanicalAimY=1, botanicalDistance=6.8,botanicalFrame=0,botanicalDrag=false,botanicalX=0,botanicalY=0;
const botanicalTarget=app.querySelector<HTMLElement>('#botany-canvas')!;
function botanicalSeed(species:SpeciesRecord,variant:number){return (variant*16+4+species.family)%256;}
function updateBotanicalCamera(){if(!botanicalCamera)return;botanicalCamera.position.set(Math.sin(botanicalAzimuth)*Math.cos(botanicalElevation)*botanicalDistance,Math.sin(botanicalElevation)*botanicalDistance+botanicalAimY,Math.cos(botanicalAzimuth)*Math.cos(botanicalElevation)*botanicalDistance);botanicalCamera.lookAt(0,botanicalAimY,0);}
function resizeBotanical(){if(!botanicalRenderer||!botanicalCamera)return;const w=botanicalTarget.clientWidth,h=botanicalTarget.clientHeight;if(w<2||h<2)return;botanicalRenderer.setSize(w,h,false);botanicalCamera.aspect=w/h;botanicalCamera.updateProjectionMatrix();}
function renderBotanical(){if(!botanicalRenderer||!botanicalScene||!botanicalCamera)return;botanicalRenderer.render(botanicalScene,botanicalCamera);botanicalFrame=requestAnimationFrame(renderBotanical);}
function selectBotanical(species:SpeciesRecord,variant=0){
 botanicalSpecies=species;botanicalVariant=variant;
 app.querySelector('#botany-name')!.textContent=species.name;
 app.querySelector('#botany-desc')!.textContent=species.description;
 app.querySelector('#botany-facts')!.textContent=`${species.group} · ${species.habitat}`;
 botanicalList.innerHTML=speciesCatalog.map(entry=>`<button data-species="${entry.id}" class="${entry.id===species.id?'active':''}">${entry.name}<span>${entry.group}</span></button>`).join('');
 botanicalList.querySelectorAll<HTMLButtonElement>('[data-species]').forEach(b=>b.onclick=()=>selectBotanical(speciesCatalog.find(entry=>entry.id===b.dataset.species)!,0));
 variantBar.innerHTML=Array.from({length:6},(_,i)=>`<button data-variant="${i}" class="${i===variant?'active':''}">Variante ${String(i+1).padStart(2,'0')}</button>`).join('');
 variantBar.querySelectorAll<HTMLButtonElement>('[data-variant]').forEach(b=>b.onclick=()=>selectBotanical(species,Number(b.dataset.variant)));
 if(!botanicalScene)return;
 if(botanicalGroup){botanicalScene.remove(botanicalGroup);botanicalGroup.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});}
 botanicalGroup=buildPlant({id:-1,kind:species.kind,x:0,z:0,seed:botanicalSeed(species,variant)});
 // Plant builders use garden coordinates; normalize them to the studio plinth.
 botanicalGroup.position.set(0,.12,0);
 // Visual scale is independent of world scale: compare silhouettes comfortably.
 const previewScale=species.kind==='flower'?1.7:species.kind==='bush'?1.15:species.kind==='rock'?1.25:species.kind==='fern'?2.05:species.kind==='pond'?1.15:1;
 botanicalGroup.scale.multiplyScalar(previewScale);
 botanicalScene.add(botanicalGroup);
 const bounds=new THREE.Box3().setFromObject(botanicalGroup);
 if(!bounds.isEmpty()){
  const size=bounds.getSize(new THREE.Vector3());
  const center=bounds.getCenter(new THREE.Vector3());
  botanicalAimY=species.kind==='pond' ? 0.2 : Math.max(.45,center.y*.80);
  botanicalDistance=THREE.MathUtils.clamp(Math.max(size.y*1.85,size.x*2.28,4.6),4.6,13);
  botanicalElevation=.33;updateBotanicalCamera();
 }
}
function openBotanical(){
 botanyPanel.hidden=false;
 document.body.classList.add('botany-open');
 if(!botanicalRenderer){
  botanicalRenderer=new THREE.WebGLRenderer({antialias:true,alpha:true});botanicalRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));botanicalRenderer.outputColorSpace=THREE.SRGBColorSpace;botanicalRenderer.toneMapping=THREE.ACESFilmicToneMapping;botanicalRenderer.toneMappingExposure=1.35;botanicalRenderer.shadowMap.enabled=true;botanicalRenderer.shadowMap.type=THREE.PCFSoftShadowMap;botanicalTarget.append(botanicalRenderer.domElement);
  botanicalScene=new THREE.Scene();botanicalScene.background=new THREE.Color('#eef0de');
  botanicalCamera=new THREE.PerspectiveCamera(36,1,.1,100);
  botanicalScene.add(new THREE.HemisphereLight(0xfff3d8,0x89937b,2.2));
  const light=new THREE.DirectionalLight(0xffecc6,2.7);light.position.set(-4,8,6);light.castShadow=true;botanicalScene.add(light);
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.57,.18,48),new THREE.MeshStandardMaterial({color:0xdbdfc3,roughness:1}));plinth.position.y=-.14;botanicalScene.add(plinth);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(1.55,64),new THREE.MeshStandardMaterial({color:0xa5bd86,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=.005;botanicalScene.add(floor);
  const canvas=botanicalRenderer.domElement;canvas.style.touchAction='none';
  canvas.addEventListener('pointerdown',e=>{botanicalDrag=true;botanicalX=e.clientX;botanicalY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointerup',()=>botanicalDrag=false);
  canvas.addEventListener('pointermove',e=>{if(!botanicalDrag)return;botanicalAzimuth+=(e.clientX-botanicalX)*.008;botanicalElevation=THREE.MathUtils.clamp(botanicalElevation+(e.clientY-botanicalY)*.006,-.15,1.3);botanicalX=e.clientX;botanicalY=e.clientY;updateBotanicalCamera();});
  canvas.addEventListener('wheel',e=>{e.preventDefault();botanicalDistance=THREE.MathUtils.clamp(botanicalDistance+Math.sign(e.deltaY)*.5,2.5,16);updateBotanicalCamera();},{passive:false});
 }
 resizeBotanical();updateBotanicalCamera();selectBotanical(botanicalSpecies,botanicalVariant);cancelAnimationFrame(botanicalFrame);renderBotanical();
}
function closeBotanical(){botanyPanel.hidden=true;document.body.classList.remove('botany-open');cancelAnimationFrame(botanicalFrame);}
app.querySelector<HTMLButtonElement>('#botany-open')!.onclick=openBotanical;
app.querySelector<HTMLButtonElement>('#botany-close')!.onclick=closeBotanical;
app.querySelector<HTMLButtonElement>('#botany-plant')!.onclick=()=>{selected=botanicalSpecies.kind;selectedSpeciesFamily=botanicalSpecies.kind==='tree'||botanicalSpecies.kind==='sapling'?botanicalSpecies.family:undefined;deleting=false;closeBotanical();refreshUI();};
window.addEventListener('resize',()=>{if(!botanyPanel.hidden)resizeBotanical();});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!botanyPanel.hidden)closeBotanical();});

window.addEventListener('resize',resize);init3d();refreshUI();
