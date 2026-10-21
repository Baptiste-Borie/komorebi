import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import './style.css';

type Style = 'lowpoly'|'organic'|'vector';
type Kind = 'tree'|'sapling'|'bush'|'flower'|'rock'|'pond';
type Plant = {id:number;kind:Kind;x:number;z:number;seed:number};
const storageKey = 'komorebi-lab-v1';
const seedGarden: Plant[] = [
  {id:1,kind:'tree',x:-2.7,z:-2.0,seed:4},{id:2,kind:'tree',x:2.7,z:1.2,seed:5},
  {id:3,kind:'sapling',x:0.1,z:-2.9,seed:6},{id:4,kind:'sapling',x:3.3,z:-2.6,seed:7},
  {id:5,kind:'bush',x:-3,z:1,seed:5},{id:6,kind:'bush',x:1.7,z:-1.8,seed:6},
  {id:7,kind:'bush',x:3.2,z:2.8,seed:7},{id:8,kind:'flower',x:-1.2,z:2.1,seed:8},
  {id:9,kind:'flower',x:0.8,z:2.8,seed:9},{id:10,kind:'flower',x:-3.6,z:3,seed:10},
  {id:11,kind:'rock',x:-1.3,z:-3.7,seed:11},{id:12,kind:'rock',x:3.8,z:-0.4,seed:12},
  {id:13,kind:'pond',x:0.3,z:0.2,seed:13},
];
let plants:Plant[] = load();
let style:Style='lowpoly';
let selected:Kind='tree';
let deleting=false;
let dense=false;
let nextId=Math.max(0,...plants.map(p=>p.id))+1;
const labels:Record<Kind,string>={tree:'Arbre',sapling:'Jeune arbre',bush:'Buisson',flower:'Fleurs',rock:'Rocher',pond:'Mare'};
const ico:Record<Kind,string>={tree:'♠',sapling:'♣',bush:'✿',flower:'✳',rock:'◆',pond:'≈'};
function load(){try{const v=JSON.parse(localStorage.getItem(storageKey)||'null'); if(Array.isArray(v)&&v.every(p=>typeof p.id==='number'&&typeof p.kind==='string'&&typeof p.x==='number'&&typeof p.z==='number'))return v as Plant[];}catch{}return seedGarden.map(p=>({...p}));}
function save(){localStorage.setItem(storageKey,JSON.stringify(plants));}
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<header><div class="brand"><span class="brand-mark">木</span><div><div class="eyebrow">ATELIER DU JARDIN · 02</div><h1>Komorebi<span> / atelier</span></h1></div></div><div class="switcher" role="status"><button data-style="lowpoly" class="active">01 <strong>Low-poly · direction retenue</strong></button></div><div class="header-right"><span class="status-dot"></span> Prototype interactif</div></header><main><aside class="sidebar"><div class="side-heading"><div class="eyebrow">COMPOSITION</div><h2>Faire pousser<br/>un jardin.</h2><p>Un petit jardin à sculpter, morceau par morceau. Choisissez un élément, puis plantez-le sur le terrain.</p></div><div class="tool-title">VÉGÉTATION & MATÉRIAUX</div><div id="tools" class="tools"></div><div class="tool-title">ÉDITION</div><button id="erase" class="secondary full">✕ &nbsp; Supprimer un élément</button><button id="reset" class="quiet full">↺ &nbsp; Restaurer le jardin</button><div class="sidebar-footer">Les éléments sont sauvegardés automatiquement dans ce navigateur.</div></aside><section class="workspace"><div class="scene-heading"><div><div class="eyebrow">ÉTUDE DE STYLE</div><h2 id="scene-title">01 — Low-poly</h2><p id="scene-description">Une prairie miniature, des silhouettes végétales et une lumière dorée.</p></div><div class="scene-actions"><button id="density">＋ Jardin dense</button><button id="home">⤢ Recentrer</button></div></div><div id="viewport" class="viewport"><div id="scene"></div><div class="scene-label">KOMOREBI / GARDEN STUDY</div><div class="hint" id="hint">Glisser pour tourner · Molette pour zoomer · Clic pour planter</div></div><div class="bottom"><span id="counter"></span><span id="fps">— FPS</span><span>Rendu procédural · herbes instanciées</span></div></section></main>`;
const viewport=app.querySelector<HTMLDivElement>('#scene')!;
const tools=app.querySelector<HTMLDivElement>('#tools')!;
(Object.keys(labels) as Kind[]).forEach(k=>{const btn=document.createElement('button');btn.dataset.kind=k;btn.innerHTML=`<span class="tool-icon">${ico[k]}</span><span>${labels[k]}</span>`;btn.onclick=()=>{selected=k;deleting=false;refreshUI();};tools.append(btn);});
let renderer:THREE.WebGLRenderer|undefined;
let scene:THREE.Scene|undefined;
let camera:THREE.OrthographicCamera|undefined;
let land:THREE.Mesh|undefined;
let objects:THREE.Group|undefined;
let request=0;
let yaw=Math.PI/4, pitch=.99, distance=16;
let dragging=false, moved=false, downX=0,downY=0;
let lastFrame=performance.now(),frames=0;
const green=[0x3e6644,0x57834d,0x739d59,0x476e4b,0x92ac69];
const mCache=new Map<string, THREE.MeshStandardMaterial>();
function mat(color:number,roughness=1){const key=`${color}-${roughness}`;let m=mCache.get(key);if(!m){m=new THREE.MeshStandardMaterial({color,roughness,flatShading:true});mCache.set(key,m);}return m;}
function shape(group:THREE.Group,geometry:THREE.BufferGeometry,color:number,x:number,y:number,z:number,rx=0,rz=0){const mesh=new THREE.Mesh(geometry,mat(color));mesh.position.set(x,y,z);mesh.rotation.set(rx,0,rz);mesh.castShadow=geometry.type === 'CylinderGeometry' || geometry.type === 'IcosahedronGeometry';mesh.receiveShadow=true;group.add(mesh);return mesh;}
function rand(seed:number,n:number){const v=Math.sin(seed*127.1+n*311.7)*43758.5453;return v-Math.floor(v);}
function tapered(group:THREE.Group,a:THREE.Vector3,b:THREE.Vector3,r0:number,r1:number,color:number,segments=6){const d=new THREE.Vector3().subVectors(b,a);const mesh=shape(group,new THREE.CylinderGeometry(r1,r0,d.length(),segments),color,0,0,0);mesh.position.copy(a).addScaledVector(d,.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return mesh;}
function foliage(group:THREE.Group,x:number,y:number,z:number,r:number,seed:number,shapeKind:'round'|'cone'='round'){
 const col=green[Math.floor(rand(seed,2)*green.length)];
 const geo=shapeKind==='cone'?new THREE.ConeGeometry(r,r*2.2,7,2):new THREE.IcosahedronGeometry(r,1);
 const crown=shape(group,geo,col,x,y,z);
 crown.scale.set(1.05+rand(seed,3)*.25,.78+rand(seed,4)*.25,.94+rand(seed,5)*.23);
 crown.rotation.y=rand(seed,6)*Math.PI;
 if(shapeKind==='round'){
  // Groups of facets keep the canopy readable at a distance, without spherical candy trees.
  for(let j=0;j<4;j++){const a=j*Math.PI*.5+rand(seed,j+10); const small=shape(group,new THREE.IcosahedronGeometry(r*.4,0),green[(j+Math.floor(seed))%green.length],x+Math.cos(a)*r*.72,y-r*.12+rand(seed,j+14)*r*.38,z+Math.sin(a)*r*.72);small.scale.y=.78;}
 }
}
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
  if(species===0){ // Oak-like spreading crown: broad, layered, asymmetrical.
   tapered(g,v(0,0,0),v(lean,1.65,0),.26,.13,trunk,7);
   for(let i=0;i<7;i++){
    const a=i*2.399,reach=.75+r(10+i)*.45;
    const x=lean+Math.cos(a)*reach,z=Math.sin(a)*reach*.87;
    const top=2.05+r(20+i)*.32;
    tapered(g,v(lean,1.15,0),v(x,top-.20,z),.095,.025,trunk,5);
    const c=shape(g,new THREE.IcosahedronGeometry(.64+r(30+i)*.21,1),
      [0x426e43,0x59834a,0x779b55,0x90a963][i%4],x,top,z);
    c.scale.set(1.16,.67+r(i+36)*.13,1.01);c.rotation.y=a;
   }
   const cap=shape(g,new THREE.IcosahedronGeometry(.89,1),0x608a4c,lean,2.43,0);
   cap.scale.set(1.3,.58,1.17);
  }else if(species===1){ // Birch: visible light trunk and separate airy sprays.
   tapered(g,v(0,0,0),v(lean,2.7,0),.16,.065,trunk,7);
   for(let i=0;i<4;i++){
    const a=i*2.4,reach=.50+r(50+i)*.33;
    const x=lean+Math.cos(a)*reach,z=Math.sin(a)*reach*.85;
    const h=1.62+i*.28;
    tapered(g,v(lean,h-.53,0),v(x,h+.27,z),.055,.012,0x9e9682,5);
    const crown=shape(g,new THREE.IcosahedronGeometry(.49+r(i+60)*.14,1),
      [0x86a968,0x9bb875,0x719954,0xacc18a][i],x,h+.32,z);
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
 if(p.kind==='bush'){
  const num=5+Math.floor(r(3)*3);
  for(let i=0;i<num;i++){const a=i*2.4,rad=.25+.17*r(i);foliage(g,Math.cos(a)*rad,.32+r(i+9)*.21,Math.sin(a)*rad,.25+r(i+6)*.13,p.seed+i);}
 }
 if(p.kind==='flower'){
  const count=8;for(let i=0;i<count;i++){const a=i*2.399,rad=.13+.37*r(i),x=Math.cos(a)*rad,z=Math.sin(a)*rad,h=.25+.23*r(i+12);tapered(g,new THREE.Vector3(x,0,z),new THREE.Vector3(x+.04,h,z),.016,.008,0x527d49,5);
   const color=[0xeedba8,0xe8b1a1,0xc7bbdf,0xf2eee0][(i+p.seed)%4];for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;const petal=shape(g,new THREE.IcosahedronGeometry(.078,0),color,x+.04+Math.cos(angle)*.067,h,z+Math.sin(angle)*.067);petal.scale.set(.8,.48,1.2);}shape(g,new THREE.IcosahedronGeometry(.035,0),0xd7ab53,x+.04,h,z);
  }
 }
 if(p.kind==='rock'){const rock=shape(g,new THREE.DodecahedronGeometry(.45+r(2)*.19,0),0x959e91,0,.3,0);rock.scale.set(1.3,.65,.85);rock.rotation.y=r(4)*6.28;}
 if(p.kind==='pond'){
  // A scalloped, shallow wetland pool instead of a circular blue disc.
  const edge:number[]=[];
  for(let i=0;i<25;i++){const a=i*Math.PI*2/24,rad=1.13+.11*Math.sin(a*3+.2)+.07*Math.cos(a*5);edge.push(Math.cos(a)*rad,Math.sin(a)*rad*.76);}
  const makePool=(radius:number,y:number,color:number)=>{
   const vertices=[0,y,0];for(let i=0;i<edge.length/2;i++)vertices.push(edge[i*2]*radius,y,edge[i*2+1]*radius);
   const idx:number[]=[];for(let i=1;i<edge.length/2;i++)idx.push(0,i+1,i);
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(idx);geo.computeVertexNormals();
   const pool=shape(g,geo,color,0,0,0);pool.castShadow=false;return pool;
  };
  makePool(1.15,.035,0x738f6a);makePool(1,.055,0x8fbdb4);
  for(let i=0;i<13;i++){
   const a=i*2.399,rad=1.11+.09*r(i+10);
   const rock=shape(g,new THREE.DodecahedronGeometry(.105+.10*r(i+20),0),i%3===0?0xa5a994:0x939b86,Math.cos(a)*rad,.067,Math.sin(a)*rad*.77);
   rock.scale.set(1.3,.36,.85);rock.rotation.y=a;rock.castShadow=false;
  }
  for(let i=0;i<8;i++){
   const a=i*2.4,rad=1.23+.13*r(i+40),x=Math.cos(a)*rad,z=Math.sin(a)*rad*.77;
   tapered(g,new THREE.Vector3(x,0,z),new THREE.Vector3(x+.07,.37+r(i+44)*.25,z+.04),.025,.007,0x5a7450,5);
  }
 }
 g.traverse((obj:THREE.Object3D)=>{if(obj instanceof THREE.Mesh)obj.userData.id=p.id;});return batchPlant(g);
}
function groundHeight(x:number,z:number){
 return .13*Math.sin(x*.6+.5)*Math.cos(z*.7)+.075*Math.sin(x*1.4+z*.9)+.035*Math.cos(z*2.1-x*.5);
}
function addLandscape(world:THREE.Scene){
 const groundGeo=new THREE.PlaneGeometry(11,11,64,64);groundGeo.rotateX(-Math.PI/2);
 const pos=groundGeo.getAttribute('position');const colors:number[]=[];
 const moss=new THREE.Color(0x718e62),meadow=new THREE.Color(0xa1b77e),warm=new THREE.Color(0xb2bf87);
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
 // Path stones form a gentle S-curve instead of an arrow-straight line.
 const stepping=new THREE.Group();
 for(let i=0;i<17;i++){
  const z=-5+i*.61,x=-.9+.48*Math.sin(i*.32);
  const stone=shape(stepping,new THREE.DodecahedronGeometry(.24+.07*rand(i,3),0),i%3===0?0x9d9b85:0xb7ad92,x,groundHeight(x,z)+.035,z);
  stone.scale.set(1.38,.21,1.05);stone.rotation.y=rand(i,8)*1.5;stone.castShadow=false;
 }
 world.add(stepping);
 // Thousands of blades cost one draw call, not thousands of individual meshes.
 const count=900, bladeGeo=new THREE.ConeGeometry(.027,.13,3),bladeMat=new THREE.MeshStandardMaterial({color:0x638850,roughness:1,flatShading:true,side:THREE.DoubleSide});
 const grass=new THREE.InstancedMesh(bladeGeo,bladeMat,count);grass.castShadow=false;grass.receiveShadow=false;
 const dummy=new THREE.Object3D(),color=new THREE.Color();
 for(let i=0;i<count;i++){
  const x=(rand(i,5)-.5)*10.4,z=(rand(i,8)-.5)*10.4;
  const h=.45+rand(i,9)*1.35;dummy.position.set(x,groundHeight(x,z)+.065*h,z);
  dummy.rotation.set((rand(i,11)-.5)*.4,rand(i,12)*6.28,(rand(i,13)-.5)*.5);
  dummy.scale.set(.6+rand(i,14)*.8,h,.6+rand(i,15)*.8);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
  color.setHex([0x4e7b47,0x6c9552,0x83a260,0x9eb77b][i%4]);grass.setColorAt(i,color);
 }
 grass.instanceMatrix.needsUpdate=true;world.add(grass);
 // Clusters of medium-height ferns bridge the scale between flowers and trees.
 const fernGeo=new THREE.ConeGeometry(.10,.46,5),fernMat=new THREE.MeshStandardMaterial({color:0x5a8050,flatShading:true,roughness:1,side:THREE.DoubleSide});
 const fernCount=160,ferns=new THREE.InstancedMesh(fernGeo,fernMat,fernCount);
 ferns.castShadow=false;ferns.receiveShadow=false;
 for(let i=0;i<fernCount;i++){
  const x=(rand(i,45)-.5)*9.8,z=(rand(i,46)-.5)*9.8;
  const h=.55+rand(i,47)*.8;
  dummy.position.set(x,groundHeight(x,z)+.22*h,z);
  dummy.rotation.set((rand(i,48)-.5)*.22,rand(i,49)*Math.PI*2,(rand(i,50)-.5)*.35);
  dummy.scale.set(.9+rand(i,51)*.6,h,.7+rand(i,52)*.5);dummy.updateMatrix();ferns.setMatrixAt(i,dummy.matrix);
  color.setHex([0x547849,0x678d57,0x75995d,0x456f49][i%4]);ferns.setColorAt(i,color);
 }
 ferns.instanceMatrix.needsUpdate=true;world.add(ferns);

 // Small clusters of stones ground the trees in the landscape.
 const pebbles=new THREE.Group();for(let i=0;i<34;i++){
  const x=(rand(i,30)-.5)*9.8,z=(rand(i,31)-.5)*9.8;
  if(Math.abs(x+.9)<.55)continue;
  const stone=shape(pebbles,new THREE.DodecahedronGeometry(.08+.08*rand(i,32),0),i%3?0x899587:0xa3a597,x,groundHeight(x,z)+.035,z);
  stone.scale.set(1,.45,1.2);stone.rotation.y=rand(i,34)*6.28;stone.castShadow=false;
 }world.add(pebbles);
}
function init3d(){renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;viewport.append(renderer.domElement);scene=new THREE.Scene();scene.background=new THREE.Color('#cbdcd2');camera=new THREE.OrthographicCamera(-8,8,5,-5,.1,100);scene.add(new THREE.HemisphereLight(0xf5ffec,0x65775b,1.35));const sun=new THREE.DirectionalLight(0xffe6c5,2.65);sun.position.set(-4,11,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.normalBias=.025;sun.shadow.radius=4;sun.shadow.blurSamples=8;scene.add(sun);addLandscape(scene);objects=new THREE.Group();scene.add(objects);refreshPlants3d();resize();updateCamera();renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('wheel',wheel,{passive:false});loop();}
function refreshPlants3d(){if(!objects)return;while(objects.children.length){const child=objects.children[0];objects.remove(child);child.traverse((obj:THREE.Object3D)=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();/* shared materials are cached; only geometry is per object */}});}plants.forEach(p=>objects!.add(buildPlant(p)));}
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
function pointerUp(e:PointerEvent){if(!dragging)return;dragging=false;if(moved||!camera||!scene||!land||!renderer)return;const rect=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);const hits=raycaster.intersectObjects(objects!.children,true);if(deleting){const id=hits[0]?.object.userData.id as number|undefined;if(id!==undefined){plants=plants.filter(p=>p.id!==id);changed();}return;}const h=raycaster.intersectObject(land)[0];if(h && Math.abs(h.point.x)<5.25 && Math.abs(h.point.z)<5.25){plants.push({id:nextId++,kind:selected,x:Math.round(h.point.x*4)/4,z:Math.round(h.point.z*4)/4,seed:nextId});changed();}}
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
function refreshUI(){app.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(b=>b.classList.toggle('active',b.dataset.style===style));app.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(b=>b.classList.toggle('active',!deleting&&b.dataset.kind===selected));app.querySelector('#erase')!.classList.toggle('active',deleting);app.querySelector('#counter')!.textContent=`${plants.length} éléments · sauvegarde locale`;app.querySelector('#scene-title')!.textContent=style==='lowpoly'?'01 — Low-poly':style==='organic'?'02 — Organique':'03 — Vectoriel';app.querySelector('#scene-description')!.textContent=style==='lowpoly'?'Des volumes francs, une nature simple et lumineuse.':style==='organic'?'Des volumes adoucis, une végétation plus généreuse.':'Des formes illustrées et des couleurs en aplats.';app.querySelector('#hint')!.textContent=style==='vector'?'Clic pour planter · Cliquez sur un élément pour le supprimer':'Glisser pour tourner · Molette pour zoomer · Clic pour planter';app.querySelector('#density')!.textContent=dense?'− Jardin épuré':'＋ Jardin dense';}
function changeStyle(s:Style){if(style===s)return;dispose();style=s;if(s==='vector')initVector();else init3d();refreshUI();}
app.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(b=>b.onclick=()=>changeStyle(b.dataset.style as Style));
app.querySelector<HTMLButtonElement>('#erase')!.onclick=()=>{deleting=!deleting;refreshUI();};
app.querySelector<HTMLButtonElement>('#reset')!.onclick=()=>{plants=seedGarden.map(p=>({...p}));dense=false;nextId=14;changed();};
app.querySelector<HTMLButtonElement>('#home')!.onclick=()=>{yaw=Math.PI/4;pitch=.89;if(camera)camera.zoom=1;updateCamera();};
app.querySelector<HTMLButtonElement>('#density')!.onclick=()=>{dense=!dense;if(dense){for(let i=0;i<110;i++){const x=Math.sin(i*44.17)*4.65,z=Math.cos(i*19.73)*4.65;plants.push({id:nextId++,kind:(['flower','bush','flower','sapling','rock'] as Kind[])[i%5],x,z,seed:i+100});}}else{plants=plants.filter(p=>p.seed<100);}changed();};
window.addEventListener('resize',resize);init3d();refreshUI();
