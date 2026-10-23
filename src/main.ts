import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import './style.css';
import { styleSurface, surfaceStudy } from './rendering/SurfaceShader';
import { ContourRenderer } from './rendering/Contours';
import { icon } from './rendering/Icons';
import { createFern } from './vegetation/fern';
import { configureRenderer, addDaylight, applySunPreset, SUN_PRESETS, type SunPreset, studioBackground } from './rendering/Lighting';
import { mat, facetSurface, contactMaterial, bakeCanopyShelter } from './rendering/Materials';
import { createWater, waterTime, waterLevel, shorePoint, shoreDistance } from './rendering/Water';

type Style = 'lowpoly'|'organic'|'vector';
type Kind = 'tree'|'sapling'|'bush'|'flower'|'rock'|'pond'|'fern';
type Plant = {id:number;kind:Kind;x:number;z:number;seed:number;rotation?:number};
const storageKey = 'komorebi-lab-v1';
// A composed reference garden, not a scattering of individual props.
// Distinct planting zones: northern grove, woodland edge, pond margin,
// flower meadow, and an open foreground. Coordinates remain editable.
const seedGarden: Plant[] = [
  {id:1,kind:'tree',x:-3.7,z:-3.45,seed:8}, // chêne haut au nord
  {id:2,kind:'tree',x:2.9,z:-3.8,seed:5},  // bouleau en lisière
  {id:3,kind:'tree',x:4.15,z:.65,seed:6}, // conifère en contrepoint
  {id:4,kind:'tree',x:-1.5,z:-4.35,seed:11}, // cyprès plus dense
  {id:5,kind:'bush',x:-4.0,z:-1.8,seed:26},
  {id:6,kind:'bush',x:-2.95,z:-2.0,seed:31},
  {id:7,kind:'bush',x:3.55,z:-2.0,seed:39},
  {id:8,kind:'bush',x:2.85,z:2.8,seed:41},
  {id:9,kind:'fern',x:-3.85,z:-.5,seed:57},
  {id:10,kind:'fern',x:-3.1,z:.05,seed:58},
  {id:11,kind:'fern',x:3.65,z:1.85,seed:65},
  {id:12,kind:'fern',x:2.65,z:3.25,seed:66},
  {id:13,kind:'flower',x:-3.55,z:2.15,seed:40},
  {id:14,kind:'flower',x:-2.7,z:2.35,seed:42},
  {id:15,kind:'flower',x:-2.1,z:3.4,seed:43},
  {id:16,kind:'flower',x:.5,z:4.0,seed:46},
  {id:17,kind:'flower',x:1.2,z:3.85,seed:47},
  {id:18,kind:'rock',x:-4.25,z:-4.2,seed:50},
  {id:19,kind:'rock',x:3.65,z:4.1,seed:51},
  {id:20,kind:'rock',x:1.8,z:1.15,seed:52},
  {id:21,kind:'pond',x:.0,z:-.40,seed:60},
];
let plants:Plant[] = load();
let style:Style='lowpoly';
let selected:Kind='tree';
let selectedSpeciesFamily:number|undefined;
let deleting=false;
let editing=false;
let pickedId:number|undefined;
let brushRotation=0;
let dense=false;
let nextId=Math.max(0,...plants.map(p=>p.id))+1;
const labels:Record<Kind,string>={tree:'Arbre',sapling:'Jeune arbre',bush:'Buisson',flower:'Fleurs',rock:'Rocher',pond:'Mare',fern:'Fougère'};
function load(){try{const v=JSON.parse(localStorage.getItem(storageKey)||'null'); if(Array.isArray(v)&&v.every(p=>typeof p.id==='number'&&typeof p.kind==='string'&&typeof p.x==='number'&&typeof p.z==='number'))return v as Plant[];}catch{}return seedGarden.map(p=>({...p}));}
function save(){localStorage.setItem(storageKey,JSON.stringify(plants));}
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<main class="garden-shell"><div id="viewport" class="viewport"><div id="scene"></div></div><nav class="hud hud-top"><div class="wordmark">${icon('sapling')}<strong>Komorebi</strong></div><div class="hud-actions"><button id="home" title="Recentrer" aria-label="Recentrer">${icon('home')}</button><button id="botany-open" title="Atelier botanique" aria-label="Ouvrir l’atelier botanique">${icon('flower')}</button><button id="density" title="Basculer la densité" aria-label="Basculer la densité">${icon('density')}</button><button id="focus" title="Masquer les commandes" aria-label="Mode contemplation">${icon('focus')}</button><button id="menu-toggle" title="Ouvrir le menu" aria-label="Ouvrir le menu">${icon('menu')}</button></div></nav><section id="build-panel" class="build-panel" aria-label="Outils du jardin"><div class="panel-top"><span>Construire</span><button id="erase" title="Supprimer un élément">✕ Effacer</button></div><div id="tools" class="tools"></div></section><aside id="menu-panel" class="menu-panel" hidden><h2>Komorebi</h2><p>Un jardin à composer librement.</p><div class="sun-settings"><strong>Étude de lumière</strong><div id="sun-presets" class="sun-presets"></div><small id="sun-label">Soleil franc</small></div><button id="reset">↺ Restaurer le jardin</button><div id="counter"></div><div id="fps"></div><small id="scene-title">01 — Low-poly</small><p id="scene-description">Jardin miniature</p><small id="hint">Glisser : rotation · Molette : zoom · Clic : planter</small></aside><section id="botany" class="botany" hidden aria-label="Atelier botanique"><div class="botany-shell"><header class="botany-top"><div><small>ATELIER BOTANIQUE · ÉTUDE 01</small><h2>Les espèces du jardin</h2><p>Observer les formes, comparer les variantes, puis retourner composer.</p></div><button id="botany-close" title="Retourner au jardin">✕ &nbsp; Retour au jardin</button></header><div class="botany-body"><aside class="botany-list" id="botany-list"></aside><div class="botany-view"><div id="botany-canvas" class="botany-canvas"></div><div class="species-navigation"><button id="species-prev" type="button" aria-label="Espèce précédente">← Précédent</button><span id="species-position"></span><button id="species-next" type="button" aria-label="Espèce suivante">Suivant →</button></div><div class="botany-variants" id="botany-variants"></div><div class="botany-help">Glisser pour tourner · Molette pour zoomer</div></div><aside class="botany-card"><small>FICHE D’ESPÈCE</small><h3 id="botany-name"></h3><p id="botany-desc"></p><div id="botany-facts"></div><div class="review-note"><label for="botany-review-note">Mes remarques sur cette espèce</label><textarea id="botany-review-note" rows="4" placeholder="Silhouette, couleurs, détail à changer…"></textarea><button id="botany-copy-note" type="button">Copier la fiche et mon avis</button></div><button id="botany-plant">Choisir pour le jardin ↗</button><small>Étude visuelle · aucune progression ni ressource</small></aside></div></div></section><button id="build-toggle" class="build-toggle" title="Afficher les outils">✿</button></main>`;
const viewport=app.querySelector<HTMLDivElement>('#scene')!;
const tools=app.querySelector<HTMLDivElement>('#tools')!;
const builderPanel=document.createElement('div');builderPanel.className='builder-details';builderPanel.innerHTML=`<div class="builder-row"><div class="builder-tools"><button id="builder-plant" class="selected">＋ Planter</button><button id="builder-select">↖ Sélectionner</button></div><button id="builder-undo" title="Annuler">↶</button><button id="builder-redo" title="Rétablir">↷</button></div><div class="builder-species" id="builder-species"></div><div id="builder-picked" hidden><div class="builder-row" style="margin-top:8px"><strong id="builder-picked-name">Élément sélectionné</strong><button id="builder-rotate">↻ Rotation</button><button id="builder-variant">✿ Variante</button><button id="builder-remove">✕ Supprimer</button></div></div><div class="builder-hint" id="builder-tip">Survolez le terrain pour prévisualiser · R pour pivoter · Ctrl+Z pour annuler</div>`;
app.querySelector('#build-panel')!.append(builderPanel);
let sunPreset:SunPreset='clear';
const sunButtons=app.querySelector<HTMLElement>('#sun-presets')!;
function chooseSun(preset:SunPreset){
 sunPreset=preset;
 if(scene)applySunPreset(scene,preset,renderer);
 if(botanicalScene)applySunPreset(botanicalScene,preset,botanicalRenderer);
 sunButtons.querySelectorAll<HTMLButtonElement>('button').forEach(b=>{b.classList.toggle('active',b.dataset.preset===preset);b.setAttribute('aria-pressed',String(b.dataset.preset===preset));});
 app.querySelector('#sun-label')!.textContent=SUN_PRESETS[preset].name;
}
(Object.keys(SUN_PRESETS) as SunPreset[]).forEach(key=>{
 const b=document.createElement('button');b.type='button';b.dataset.preset=key;b.textContent=SUN_PRESETS[key].name;
 b.onclick=()=>chooseSun(key);sunButtons.append(b);
});

app.querySelector<HTMLButtonElement>('#menu-toggle')!.onclick=()=>{
 const panel=app.querySelector<HTMLElement>('#menu-panel')!;panel.hidden=!panel.hidden;
};
app.querySelector<HTMLButtonElement>('#focus')!.onclick=()=>app.classList.toggle('contemplation');
app.querySelector<HTMLButtonElement>('#build-toggle')!.onclick=()=>app.classList.toggle('tools-open');
(Object.keys(labels) as Kind[]).forEach(k=>{const btn=document.createElement('button');btn.dataset.kind=k;btn.innerHTML=`<span class="tool-icon">${icon(k)}</span><span>${labels[k]}</span>`;btn.onclick=()=>{selected=k;selectedSpeciesFamily=undefined;deleting=false;editing=false;pickedId=undefined;refreshUI();updateGhost();};tools.append(btn);});
let renderer:THREE.WebGLRenderer|undefined;
let gardenContours:ContourRenderer|undefined;
let scene:THREE.Scene|undefined;
let camera:THREE.OrthographicCamera|undefined;
let land:THREE.Mesh|undefined;
let objects:THREE.Group|undefined;
let landscape:THREE.Group|undefined;
const densityIds = new Set<number>();
let request=0;
let yaw=Math.PI/4, pitch=.99, distance=16;
let dragging=false, moved=false, downX=0,downY=0;
let downClientX=0,downClientY=0;
let moveId:number|undefined,moveStart:Plant|undefined;
let ghost:THREE.Group|undefined;
let ghostKey="";
const undoStack:Plant[][]=[];const redoStack:Plant[][]=[];
const snapshot=()=>plants.map(p=>({...p}));
function record(before:Plant[]){undoStack.push(before);if(undoStack.length>80)undoStack.shift();redoStack.length=0;}
function restore(history:Plant[][],other:Plant[][]){if(!history.length)return;other.push(snapshot());plants=history.pop()!;nextId=Math.max(0,...plants.map(p=>p.id))+1;moveId=undefined;pickedId=undefined;changed();updateGhost();}
function doUndo(){restore(undoStack,redoStack);}
function doRedo(){restore(redoStack,undoStack);}
let lastFrame=performance.now(),frames=0;
function shape(group:THREE.Group,geometry:THREE.BufferGeometry,color:number,x:number,y:number,z:number,rx=0,rz=0){
 const faceted=['IcosahedronGeometry','DodecahedronGeometry','ConeGeometry'].includes(geometry.type);
 const surface=faceted?facetSurface(geometry,color):null;
 if(surface)geometry.dispose();
 const mesh=new THREE.Mesh(surface?.geometry??geometry,surface?.material??mat(color,1,geometry.type==='CylinderGeometry'?'bark':'botanical'));
 mesh.position.set(x,y,z);mesh.rotation.set(rx,0,rz);
 const pigment=new THREE.Color(color);
 mesh.userData.canopy=faceted&&pigment.g>pigment.r*1.12&&pigment.g>pigment.b*1.15&&(geometry.type==='ConeGeometry'||geometry.type==='IcosahedronGeometry');
 mesh.castShadow=geometry.type==='CylinderGeometry'||faceted;mesh.receiveShadow=true;
 group.add(mesh);return mesh;
}
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
 const g=new THREE.Group();g.position.set(p.x,p.kind==='pond'?baseHeight(p.x,p.z):groundHeight(p.x,p.z),p.z);g.userData.id=p.id;g.rotation.y=p.rotation??0;
 // Soft local grounding without opaque canopy silhouettes painted across grass.
 // Exclude water: its surface must remain bright, not receive a shadow disc.
 if(p.kind==='tree'||p.kind==='sapling'||p.kind==='bush'||p.kind==='rock'){
  const radius=p.kind==='tree'? .82 : p.kind==='sapling'? .47 : p.kind==='bush'? .42 : .40;
  const contact=new THREE.Mesh(
   new THREE.PlaneGeometry(radius*2.4,radius*2.4),
   contactMaterial
  );
  contact.rotation.x=-Math.PI/2;
  contact.scale.y=.82;
  contact.position.y=.018;
  contact.castShadow=false;contact.receiveShadow=false;
  g.add(contact);
 }
 const r=(n:number)=>rand(p.seed,n);
 if(p.kind==='tree'||p.kind==='sapling'){
  const young=p.kind==='sapling';
  g.scale.setScalar(young?.62:1);
  const species=p.seed%4;
  const lean=(r(1)-.5)*.16;
  const trunk=species===1?0xc9c2ac:species===2?0x6f624c:0x796448;
  const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
  if(species===0){ // An open broadleaf canopy: irregular lobes, visible branching and a coherent crown.
   const crown=[0x518d43,0x609849,0x72a34f,0x82ad59,0x92b562,0x5c9647];
   const canopyY=2.28+r(2)*.35;
   tapered(g,v(0,0,0),v(lean,1.63,0),.25,.13,trunk,7);
   for(let i=0;i<9;i++){
    const a=i*2.399963+(r(i+7)-.5)*.32;
    const radius=.66+.58*r(i+11), x=lean+Math.cos(a)*radius,z=Math.sin(a)*radius*.85;
    const y=canopyY+(r(i+19)-.5)*(.55+.5*r(101));
    const branchTip=v(x*.83,y-.14,z*.83);
    tapered(g,v(lean,1.29,0),branchTip,.088,.028,trunk,5);
    const lobe=shape(g,new THREE.IcosahedronGeometry(.55+.18*r(i+28),1),crown[(i+Math.floor(r(i+30)*3))%crown.length],x,y,z);
    lobe.scale.set(.96+.32*r(i+32),.74+.29*r(i+36),.86+.24*r(i+40));
    lobe.rotation.y=a;lobe.castShadow=true;
   }
   for(let i=0;i<3;i++){
    const a=i*2.1+1.4;
    const lobe=shape(g,new THREE.IcosahedronGeometry(.60+.08*r(i+54),1),crown[(i+3)%crown.length],lean+Math.cos(a)*.38,2.55+r(i+57)*.32,Math.sin(a)*.33);
    lobe.scale.set(1.02,.68,.93);lobe.castShadow=true;
   }
   }else if(species===1){ // Birch: clustered slender trunks, coherent crown and surface-attached bark scars.
   const greens=[0x719d4b,0x80a956,0x92b55e,0x76a454,0x9bb868];
   const multi=r(96)>.53?3:r(97)>.50?2:1;
   const baseLean=(r(98)-.5)*.12;
   for(let trunkId=0;trunkId<multi;trunkId++){
    const baseAngle=trunkId*2.399963+.4;
    const startX=trunkId===0?0:Math.cos(baseAngle)*(.12+.045*r(trunkId+90));
    const startZ=trunkId===0?0:Math.sin(baseAngle)*(.12+.045*r(trunkId+91));
    const height=(trunkId===0?3.05:2.48+.35*r(trunkId+92))*(.91+.19*r(trunkId+93));
    const topX=startX+baseLean+(trunkId===0?0:Math.cos(baseAngle)*.20);
    const topZ=startZ+(trunkId===0?0:Math.sin(baseAngle)*.17);
    const bottom=new THREE.Vector3(startX,0,startZ),top=new THREE.Vector3(topX,height,topZ);
    const radius=trunkId===0?.14:.092;
    tapered(g,bottom,top,radius,.032,0xe7e4d0,9);
    // Wrap short organic dark bark scars around the *real sloping trunk*.
    // The surface radius decreases with height; each polygon follows it.
    for(let i=0;i<20;i++){
     const t=.10+i*.039+r(i+trunkId*40+110)*.016;
     const angle=i*2.399963+trunkId*.74;
     const width=.38+.52*r(i+trunkId*30+120);
     const t2=Math.min(.97,t+.008+.012*r(i+trunkId*30+125));
     const tangent=new THREE.Vector3().subVectors(top,bottom);
     const radial=(a:number,tt:number)=>{
      const center=bottom.clone().addScaledVector(tangent,tt);
      const rr=radius+( .032-radius)*tt+.0035;
      return [center.x+Math.cos(a)*rr,center.y,center.z+Math.sin(a)*rr];
     };
     // Short dashes, wedges, triangular scars and wider irregular bark flecks.
     const shapeType=(i+Math.floor(r(i+trunkId*30+201)*4))%4;
     const a=radial(angle,t),b=radial(angle+width,t),c=radial(angle,t2),d=radial(angle+width*.86,t2);
     const mid=radial(angle+width*(.33+.34*r(i+203)),Math.min(.98,t2+.004));
     const vertices=shapeType===0?[...a,...b,...c]:
       shapeType===1?[...a,...b,...c,...b,...d,...c]:
       shapeType===2?[...a,...b,...mid]:
       [...a,...b,...c,...b,...d,...c,...c,...d,...mid];
     const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
     const scar=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:i%7===0?0x64665b:0x363e37,roughness:1,side:THREE.DoubleSide}));
     scar.castShadow=false;g.add(scar);
    }
    const branches=trunkId===0?9:5;
    for(let i=0;i<branches;i++){
     const a=i*2.399963+trunkId*.7+r(i+140)*.20;
     const t=.46+(i%5)*.09+.025*r(i+147);
     const origin=bottom.clone().lerp(top,t);
     const reach=.42+.43*r(i+150);
     const tip=origin.clone().add(v(Math.cos(a)*reach,.20+.18*r(i+155),Math.sin(a)*reach));
     tapered(g,origin,tip,.035,.012,0xd4cdbb,5);
     // Foliar clusters originate from branch tips: sparse compared to oak,
     // but enough nested crowns to avoid a naked hanging-grape silhouette.
     for(let j=0;j<4;j++){
      const side=a+j*1.618+.4;
      const cx=tip.x+Math.cos(side)*(.13+.13*r(j+i*9+160));
      const cy=tip.y+(.08-.20*r(j+i*9+164));
      const cz=tip.z+Math.sin(side)*(.12+.11*r(j+i*9+168));
      tapered(g,tip,v(cx,cy+.10,cz),.012,.004,0xaba998,4);
      const leaf=shape(g,new THREE.IcosahedronGeometry(.23+.09*r(i*6+j+172),1),greens[(i+j+trunkId)%greens.length],cx,cy,cz);
      leaf.scale.set(.88+.17*r(i+j+181),.82+.27*r(i+j+180),.89);leaf.castShadow=false;
     }
    }    // Crown clusters grow from the leader itself; some variants have a tall
    // open tip while others have several overlapping, leafy top clusters.
    const upperCount=trunkId===0?2+Math.floor(r(250)*3):1+Math.floor(r(251+trunkId)*2);
    for(let i=0;i<upperCount;i++){
     const a=i*2.39996+r(i+trunkId*11+260)*.9;
     const spread=.08+.19*r(i+270);
     const position=top.clone().add(v(Math.cos(a)*spread,-.10-.21*r(i+280)-i*.07,Math.sin(a)*spread));
     tapered(g,top.clone().add(v(0,-.36,0)),position,.022,.008,0xd4cdbb,5);
     const crown=shape(g,new THREE.IcosahedronGeometry(.19+.11*r(i+290),1),
      greens[(i+trunkId+Math.floor(r(299)*3))%greens.length],position.x,position.y,position.z);
     crown.scale.set(.90, .78+.24*r(i+300), .86);crown.castShadow=false;
    }
   }
  }else if(species===2){ // Pine: staggered conical whorls with the trunk below.
   tapered(g,v(0,0,0),v(lean,3.12,0),.22,.045,trunk,7);
   for(let i=0;i<4;i++){
    const y=1.17+i*.51;
    const tier=shape(g,new THREE.ConeGeometry(1.08-i*.19,.98,7,1),
      [0x285b49,0x326d50,0x43815a,0x5d9564][i],lean,y,0);
    tier.scale.z=.89;
    tier.rotation.y=.24+i*.22;
   }
   const tip=shape(g,new THREE.ConeGeometry(.30,.65,7),0x6b9c65,lean,3.04,0);
   tip.rotation.y=.3;
   }else{ // Cypress: compact bushy column tapering into a soft rounded crown.
   const height=2.65+r(107)*.75;
   tapered(g,v(0,0,0),v(lean,height,0),.14,.025,trunk,6);
   const columns=5+Math.floor(r(108)*3);
   for(let i=0;i<columns;i++){
    const a=i*2.399963,outer=i===0?0:.08+.10*r(i+163);
    const y=i===0?height*.56:.79+(i/(columns-1))*height*.42;
    const radius=i===0?.31:.19+.105*r(i+170);
    const sizeY=i===0?height*.63:.73+.40*r(i+171);
    const crown=shape(g,new THREE.IcosahedronGeometry(1,1),
     [0x326b43,0x3d7a49,0x4c8853,0x558f57,0x61965c][i%5],
     lean+Math.cos(a)*outer,y,Math.sin(a)*outer);
    crown.scale.set(radius,sizeY,radius*(.85+.18*r(i+174)));
    crown.rotation.y=a;crown.castShadow=false;
   }
   // The tip grows out of the last volume, not as an isolated finial.
   const peak=shape(g,new THREE.ConeGeometry(.18,.75,7,1),0x578e55,
    lean,height-.31,0);
   peak.castShadow=false;
  }
 }
 if(p.kind==='fern'){
  const fern=createFern(p.seed);
  for(const child of [...fern.children])g.add(child);
 }
 if(p.kind==='bush'){
  const num=7+Math.floor(r(3)*4);
  const greens=[0x3c8545,0x609d42,0x7fae48,0x4c8e45,0xa2bf57];
  for(let i=0;i<num;i++){
   const a=i*2.399+ r(i+31)*.18,rad=.17+.24*r(i);
   const x=Math.cos(a)*rad,z=Math.sin(a)*rad;
   const radius=.23+r(i+6)*.15;
   tapered(g,new THREE.Vector3(0,.015,0),new THREE.Vector3(x,.22+r(i+9)*.15,z),.045,.014,0x59764a,5);
   const ball=shape(g,new THREE.IcosahedronGeometry(radius,1),greens[(i+p.seed)%greens.length],x,.19+r(i+9)*.16,z);
   ball.scale.set(1.15,.82+r(i+10)*.22,.95);ball.castShadow=true;
  }
  // Basal leaves ground the shrub and break up the spherical silhouette.
  for(let i=0;i<12;i++){
   const a=i*2.399+ r(i+60)*.15,rad=.3+r(i+61)*.28;
   const leaf=shape(g,new THREE.IcosahedronGeometry(.13+r(i+63)*.06,0),greens[i%greens.length],Math.cos(a)*rad,.045,Math.sin(a)*rad);
   leaf.scale.set(.92,.18,1.30);leaf.rotation.y=a;leaf.castShadow=false;
  }
 }
 if(p.kind==='flower'){
  const count=8;for(let i=0;i<count;i++){const a=i*2.399,rad=.13+.37*r(i),x=Math.cos(a)*rad,z=Math.sin(a)*rad,h=.25+.23*r(i+12);tapered(g,new THREE.Vector3(x,0,z),new THREE.Vector3(x+.04,h,z),.016,.008,0x527d49,5);
   for(let side of [-1,1]){
    const leaf=shape(g,new THREE.IcosahedronGeometry(.10+r(i+71)*.03,0),side===1?0x5b944a:0x75a35d,x+side*.085,.12+r(i+72)*.08,z+side*.07);
    leaf.scale.set(.65,.25,1.45);leaf.rotation.y=side*.45+i*.35;leaf.castShadow=false;
   }
   const color=[0xf8c642,0xf48270,0xa488d1,0xfff4dc][(i+p.seed)%4];for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;const petal=shape(g,new THREE.IcosahedronGeometry(.078,0),color,x+.04+Math.cos(angle)*.067,h,z+Math.sin(angle)*.067);petal.scale.set(.8,.48,1.2);}shape(g,new THREE.IcosahedronGeometry(.035,0),0xd7ab53,x+.04,h,z);
  }
 }
 if(p.kind==='rock'){const rock=shape(g,new THREE.DodecahedronGeometry(.45+r(2)*.19,0),0x969590,0,.3,0);rock.scale.set(1.3,.65,.85);rock.rotation.y=r(4)*6.28;}
 if(p.kind==='pond'){
  g.add(createWater());
  // A conforming bank instead of stacked discs. The outer vertices follow
  // the real terrain, including the hollows of any neighboring ponds.
  const steps=64, vertices:number[]=[], colors:number[]=[], indices:number[]=[];
  const sand=new THREE.Color(0xb7ac80), grass=new THREE.Color(0x8eac58);
  for(let i=0;i<=steps;i++){
   const angle=i*Math.PI*2/steps, inner=shorePoint(angle,.98), outer=shorePoint(angle,1.22);
   vertices.push(inner.x,waterLevel-.015,inner.z,
    outer.x,Math.max(waterLevel+.018,groundHeight(p.x+outer.x,p.z+outer.z)-baseHeight(p.x,p.z)+.008),outer.z);
   colors.push(sand.r,sand.g,sand.b,grass.r,grass.g,grass.b);
   if(i<steps){const v=i*2;indices.push(v,v+2,v+1,v+1,v+2,v+3);}
  }
  const bankGeometry=new THREE.BufferGeometry();
  bankGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  bankGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  bankGeometry.setIndex(indices);bankGeometry.computeVertexNormals();
  const bank=new THREE.Mesh(bankGeometry,terrainMaterial);bank.receiveShadow=true;g.add(bank);
  // Small natural bankside clusters, leaving most shoreline open.
  for(let i=0;i<12;i++){
   const a=i*2.399,rad=1.20+.13*r(i+10),x=Math.cos(a)*rad,z=Math.sin(a)*rad*.8;
   if(i%3===0){
    const rock=shape(g,new THREE.DodecahedronGeometry(.09+.065*r(i+20),0),i%2?0xa9ac94:0x858f79,x,waterLevel+.02,z);
    rock.scale.set(1.35,.43,.86);rock.castShadow=false;
   }else{
    for(let j=0;j<3;j++){
     const lean=(j-1)*.09;
     tapered(g,new THREE.Vector3(x,waterLevel,z),new THREE.Vector3(x+lean,.24+.15*r(i+j+30),z+.06),.012,.003,0x53794e,4);
    }
   }
  }
  // Water lily leaves sit just above the pool and do not cast hard shadows.
  for(let i=0;i<3;i++){
   const a=i*2.35+.4,rr=.32+.29*r(i+50),x=Math.cos(a)*rr,z=Math.sin(a)*rr*.75;
   const leaf=shape(g,new THREE.CylinderGeometry(.13,.13,.012,7),i===1?0x668d53:0x729d5b,x,waterLevel+.016,z);
   leaf.scale.z=.78;leaf.rotation.y=a;leaf.castShadow=false;
  }
 }
 if(p.kind==='tree'||p.kind==='sapling'||p.kind==='bush')bakeCanopyShelter(g);
 g.traverse((obj:THREE.Object3D)=>{if(obj instanceof THREE.Mesh)obj.userData.id=p.id;});return batchPlant(g);
}
const terrainMaterial=styleSurface(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),'ground');
function baseHeight(x:number,z:number){
 return .13*Math.sin(x*.6+.5)*Math.cos(z*.7)+.075*Math.sin(x*1.4+z*.9)+.035*Math.cos(z*2.1-x*.5);
}
function nearWater(x:number,z:number,margin=1.35){
 return plants.some(p=>p.kind==='pond'&&shoreDistance(x-p.x,z-p.z)<margin);
}
function groundHeight(x:number,z:number){
 const base=baseHeight(x,z);
 let height=base;
 for(const pond of plants){if(pond.kind!=='pond')continue;
  const d=shoreDistance(x-pond.x,z-pond.z);
  const t=1-THREE.MathUtils.smoothstep(d,.80,1.30);
  const bed=baseHeight(pond.x,pond.z)+waterLevel-.16;
  height=Math.min(height,THREE.MathUtils.lerp(base,bed,t));
 }
 return height;
}
function disposeGeometry(group:THREE.Object3D){
 group.traverse(object=>{if(object instanceof THREE.Mesh)object.geometry.dispose();});
}
function addLandscape(world:THREE.Group){
 const groundGeo=new THREE.PlaneGeometry(11,11,64,64);groundGeo.rotateX(-Math.PI/2);
 const pos=groundGeo.getAttribute('position');const colors:number[]=[];
 const moss=new THREE.Color(0x65945b),meadow=new THREE.Color(0xa7c665),warm=new THREE.Color(0xc3d57c);
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,groundHeight(x,z));
  const t=.5+.12*Math.sin(x*1.05+z*.75)+.07*Math.cos(z*1.63-x*.48)+.025*Math.sin(x*2.8-z*3.1);
  const color=moss.clone().lerp(meadow,THREE.MathUtils.clamp(t,0,1));
  color.lerp(warm,.28*Math.max(0,Math.sin(z*1.9+x*.7)));
  // Broad plant footprints tint the ground without adding grass meshes.
  let cover=0,wet=0;
  for(const plant of plants){
   if(plant.kind==='pond'){
    const d=shoreDistance(x-plant.x,z-plant.z);
    wet=Math.max(wet,1-THREE.MathUtils.smoothstep(d,1.15,1.65));continue;
   }
   const radius=plant.kind==='tree'?1.55:plant.kind==='sapling'?1:plant.kind==='bush'?.85:.6;
   const influence=1-THREE.MathUtils.smoothstep(Math.hypot(x-plant.x,z-plant.z),.08,radius);
   cover=Math.max(cover,influence*(plant.kind==='flower'?.18:.40));
  }
  const step=(z+4.9)/.24,pathX=-1.30+.29*Math.sin(step*.23)+.13*Math.sin(step*.72);
  const worn=(1-THREE.MathUtils.smoothstep(Math.abs(x-pathX),.10,.52))*.17;
  color.lerp(new THREE.Color(0xc7c28b),worn*(1-wet));
  color.lerp(new THREE.Color(0x63874b),cover).lerp(new THREE.Color(0x689650),wet*.22);
  colors.push(color.r,color.g,color.b);
 }
 groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));groundGeo.computeVertexNormals();
 land=new THREE.Mesh(groundGeo,terrainMaterial);land.receiveShadow=true;world.add(land);
 // The skirt follows the grass edge exactly. A flat box top used to poke
 // through low terrain and create large dark islands mistaken for shadows.
 const skirtVertices:number[]=[],skirtColors:number[]=[],skirtIndices:number[]=[];
 const rim=new THREE.Color(0x647f3d), soil=new THREE.Color(0x9d8564), deep=new THREE.Color(0x716653);
 const outline:THREE.Vector2[]=[];
 for(let side=0;side<4;side++)for(let i=0;i<64;i++){
  const a=-5.5+11*i/64;
  outline.push(new THREE.Vector2(...([[a,-5.5],[5.5,a],[-a,5.5],[-5.5,-a]][side] as [number,number])));
 }
 outline.push(outline[0]);
 outline.forEach((q,i)=>{
  const top=groundHeight(q.x,q.y);
  for(const [y,c] of [[top,rim],[top-.075,rim],[-.32,soil],[-.88,deep]] as [number,THREE.Color][]){
   skirtVertices.push(q.x,y,q.y);skirtColors.push(c.r,c.g,c.b);
  }
  if(i<outline.length-1)for(let layer=0;layer<3;layer++){
   const v=i*4+layer;skirtIndices.push(v,v+4,v+1,v+1,v+4,v+5);
  }
 });
 const skirtGeometry=new THREE.BufferGeometry();
 skirtGeometry.setAttribute('position',new THREE.Float32BufferAttribute(skirtVertices,3));
 skirtGeometry.setAttribute('color',new THREE.Float32BufferAttribute(skirtColors,3));
 skirtGeometry.setIndex(skirtIndices);skirtGeometry.computeVertexNormals();
 const skirt=new THREE.Mesh(skirtGeometry,terrainMaterial);skirt.castShadow=true;world.add(skirt);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),mat(studioBackground,1,'plain'));
 floor.rotation.x=-Math.PI/2;floor.position.y=-.90;floor.receiveShadow=true;world.add(floor);
 // An informal footpath: small, irregular stones in a gently meandering strip.
 // Two instanced materials keep it inexpensive even as the garden grows.
 const pathGeo=new THREE.DodecahedronGeometry(1,0);
 const pathPalette=[0xc6bdb0,0x999c9d];
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
   if(nearWater(x,z,1.42))transform.scale.setScalar(0);
   transform.updateMatrix();
   pathMesh.setMatrixAt(i,transform.matrix);
  }
  pathMesh.instanceMatrix.needsUpdate=true;
  world.add(pathMesh);
 }
 // Groundcover uses the same botanical fronds as the workshop. One shared
 // template, instanced by material: no scattered giant leaf triangles.
 const colonies=[[-3.8,-2.6],[-2.9,2.7],[3.6,-3.1],[3.7,2.9],[-3.6,.3],[2.9,.2],[-.1,3.5]];
 const placements:THREE.Matrix4[]=[];
 const transform=new THREE.Object3D();
 for(let colony=0;colony<colonies.length;colony++)for(let i=0;i<3;i++){
  const [cx,cz]=colonies[colony],a=i*2.399+colony;
  const x=cx+Math.cos(a)*(.25+rand(colony,i)*.35),z=cz+Math.sin(a)*.45;
  if(nearWater(x,z,1.65)||Math.abs(x+1.3)<.55)continue;
  transform.position.set(x,groundHeight(x,z),z);
  transform.rotation.set(0,a,0);transform.scale.setScalar(.48+rand(i,colony)*.22);
  transform.updateMatrix();placements.push(transform.matrix.clone());
 }
 const template=batchPlant(createFern(17));
 for(const child of template.children){
  if(!(child instanceof THREE.Mesh))continue;
  const patch=new THREE.InstancedMesh(child.geometry,child.material,placements.length);
  placements.forEach((matrix,i)=>patch.setMatrixAt(i,matrix));
  patch.instanceMatrix.needsUpdate=true;patch.receiveShadow=true;
  world.add(patch);
 }

 // Small clusters of stones ground the trees in the landscape.
 const pebbles=new THREE.Group();for(let i=0;i<34;i++){
  const x=(rand(i,30)-.5)*9.8,z=(rand(i,31)-.5)*9.8;
  if(Math.abs(x+1.3)<.55||nearWater(x,z,1.4))continue;
  const stone=shape(pebbles,new THREE.DodecahedronGeometry(.08+.08*rand(i,32),0),i%3?0x899587:0xa3a597,x,groundHeight(x,z)+.035,z);
  stone.scale.set(1,.45,1.2);stone.rotation.y=rand(i,34)*6.28;stone.castShadow=false;
 }world.add(batchPlant(pebbles));
}
function init3d(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});configureRenderer(renderer);gardenContours=new ContourRenderer(renderer);
 viewport.append(renderer.domElement);scene=new THREE.Scene();addDaylight(scene);applySunPreset(scene,sunPreset,renderer);
 camera=new THREE.OrthographicCamera(-8,8,5,-5,.1,100);
 objects=new THREE.Group();scene.add(objects);refreshPlants3d();resize();updateCamera();
 renderer.domElement.addEventListener('pointerdown',pointerDown);
 renderer.domElement.addEventListener('pointermove',pointerMove);
 renderer.domElement.addEventListener('pointerup',pointerUp);
 renderer.domElement.addEventListener('wheel',wheel,{passive:false});renderer.domElement.addEventListener('pointerleave',()=>{if(ghost)ghost.visible=false;});updateGhost();loop();
}
let previousPlants:Plant[]=[];
function refreshPlants3d(){
 if(!objects||!scene)return;
 const old=previousPlants;
 const oldById=new Map(old.map(p=>[p.id,p]));
 const newById=new Map(plants.map(p=>[p.id,p]));
 const changedPond=old.some(p=>p.kind==='pond'&&!newById.has(p.id))||plants.some(p=>p.kind==='pond'&&!oldById.has(p.id));
 if(!changedPond && landscape && old.length){
  for(const child of [...objects.children]){
   const original=oldById.get(Number(child.userData.id));
   const current=newById.get(Number(child.userData.id));
   if(!current || !original || original.kind!==current.kind || original.seed!==current.seed || original.x!==current.x || original.z!==current.z || original.rotation!==current.rotation){
    objects.remove(child);disposeGeometry(child);
   }
  }
  const present=new Set(objects.children.map(c=>Number(c.userData.id)));
  for(const plant of plants)if(!present.has(plant.id))objects.add(buildPlant(plant));
  previousPlants=plants.map(p=>({...p}));
  if(renderer)renderer.shadowMap.needsUpdate=true;
  return;
 }
 dropGhost();disposeGeometry(objects);objects.clear();
 if(landscape){scene.remove(landscape);disposeGeometry(landscape);}
 landscape=new THREE.Group();scene.add(landscape);addLandscape(landscape);
 plants.forEach(p=>objects!.add(buildPlant(p)));
 previousPlants=plants.map(p=>({...p}));
 if(renderer)renderer.shadowMap.needsUpdate=true;
}
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
const reviewParams=new URLSearchParams(location.search);
const reviewTime=reviewParams.has('review')&&reviewParams.has('time')?Number(reviewParams.get('time')):undefined;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
function updateWater(){waterTime.value=reducedMotion.matches?0:reviewTime!==undefined&&Number.isFinite(reviewTime)?reviewTime:performance.now()*.001;}
function loop(){
 request=requestAnimationFrame(loop);
 if(document.hidden||document.body.classList.contains('botany-open'))return;
 if(renderer&&(Math.abs(renderer.domElement.clientWidth-viewport.clientWidth)>2||Math.abs(renderer.domElement.clientHeight-viewport.clientHeight)>2))resize();
 updateWater();if(scene&&camera)gardenContours?.render(scene,camera);frames++;const now=performance.now();
 if(now-lastFrame>1000){app.querySelector('#fps')!.textContent=`${Math.round(frames*1000/(now-lastFrame))} FPS · ${renderer?.info.render.calls??0} appels GPU`;frames=0;lastFrame=now;}
}
function pointerDown(e:PointerEvent){
 dragging=true;moved=false;downX=e.clientX;downY=e.clientY;downClientX=e.clientX;downClientY=e.clientY;
 moveId=editing&&!deleting?pickedAt(e):undefined;
 moveStart=moveId!==undefined?{...plants.find(p=>p.id===moveId)!}:undefined;
 (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
}
function pointerMove(e:PointerEvent){
 if(!dragging){updateGhost(e);return;}
 const total=Math.abs(e.clientX-downClientX)+Math.abs(e.clientY-downClientY);
 if(total>4)moved=true;
 if(editing&&moveId!==undefined){
  if(moved){const pt=placePoint(e);const p=plants.find(p=>p.id===moveId);if(pt&&p){p.x=pt.x;p.z=pt.z;const group=objects?.children.find(c=>c.userData.id===moveId);if(group)group.position.set(pt.x,p.kind==='pond'?baseHeight(pt.x,pt.z):groundHeight(pt.x,pt.z),pt.z);}}
 }else if(moved){const dx=e.clientX-downX,dy=e.clientY-downY;yaw-=dx*.008;pitch=Math.max(.35,Math.min(1.5,pitch+dy*.006));updateCamera();}
 downX=e.clientX;downY=e.clientY;
}
function pointerUp(e:PointerEvent){
 if(!dragging)return;dragging=false;
 if(moveId!==undefined){
  const p=plants.find(p=>p.id===moveId);
  if(p&&moveStart&&(p.x!==moveStart.x||p.z!==moveStart.z)){
   const before=snapshot().map(item=>item.id===moveId?moveStart!:item);record(before);changed();
  }
  pickedId=moveId;moveId=undefined;moveStart=undefined;refreshUI();return;
 }
 if(moved||!camera||!scene||!renderer)return;
 if(deleting){const id=pickedAt(e);if(id!==undefined){record(snapshot());plants=plants.filter(p=>p.id!==id);if(pickedId===id)pickedId=undefined;changed();}return;}
 if(editing){pickedId=pickedAt(e);refreshUI();return;}
 const pt=placePoint(e);if(!pt)return;
 const seed=selectedSpeciesFamily!==undefined&&(selected==='tree'||selected==='sapling')?nextId*4+selectedSpeciesFamily:nextId;
 record(snapshot());plants.push({id:nextId++,kind:selected,x:pt.x,z:pt.z,seed,rotation:brushRotation});changed();updateGhost(e);
}
const raycaster=new THREE.Raycaster();const mouse=new THREE.Vector2();
function placePoint(e:PointerEvent){
 if(!renderer||!camera||!land)return;
 const rect=renderer.domElement.getBoundingClientRect();
 mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
 raycaster.setFromCamera(mouse,camera);
 const hit=raycaster.intersectObject(land)[0];
 if(!hit||Math.abs(hit.point.x)>=5.25||Math.abs(hit.point.z)>=5.25)return;
 return {x:Math.round(hit.point.x*4)/4,z:Math.round(hit.point.z*4)/4};
}
function pickedAt(e:PointerEvent){
 if(!camera||!renderer||!objects)return;
 const rect=renderer.domElement.getBoundingClientRect();
 mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
 raycaster.setFromCamera(mouse,camera);
 // Parent group stores ID; merged meshes may store it too.
 const hits=raycaster.intersectObjects(objects.children,true);
 for(const hit of hits){let node:THREE.Object3D|null=hit.object;while(node && node!==objects){if(typeof node.userData.id==='number')return node.userData.id as number;node=node.parent;}}
}
function dropGhost(){if(ghost&&scene){scene.remove(ghost);disposeGeometry(ghost);}ghost=undefined;ghostKey='';}
function updateGhost(e?:PointerEvent){
 if(!scene||!camera||!renderer||deleting||editing||document.body.classList.contains('botany-open')){dropGhost();return;}
 const seed=selectedSpeciesFamily!==undefined&&(selected==='tree'||selected==='sapling')?nextId*4+selectedSpeciesFamily:nextId;
 const key=selected+':'+seed+':'+brushRotation;
 if(key!==ghostKey){dropGhost();ghost=buildPlant({id:-9999,kind:selected,x:0,z:0,seed,rotation:brushRotation});ghostKey=key;
  ghost.traverse(c=>{if(c instanceof THREE.Mesh){c.castShadow=false;c.receiveShadow=false;const source=c.material as THREE.Material;
    // Only ghost meshes receive temporary transparent material clones.
    const m=source.clone() as THREE.MeshStandardMaterial;m.transparent=true;m.opacity=.48;m.depthWrite=false;c.material=m;}});
  ghost.userData.preview=true;scene.add(ghost);
 }
 if(!ghost)return;
 if(e){const pt=placePoint(e);ghost.visible=!!pt;if(pt)ghost.position.set(pt.x,selected==='pond'?baseHeight(pt.x,pt.z):groundHeight(pt.x,pt.z),pt.z);}
 else ghost.visible=false;
}
function redrawSelection(){if(!objects)return;objects.children.forEach(c=>{c.traverse(node=>{if(node instanceof THREE.Mesh){const selectedNow=Number(c.userData.id)===pickedId;node.userData.builderSelected=selectedNow;}});});}

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
function dispose(){cancelAnimationFrame(request);renderer?.domElement.removeEventListener('pointerdown',pointerDown);renderer?.domElement.removeEventListener('pointermove',pointerMove);renderer?.domElement.removeEventListener('pointerup',pointerUp);renderer?.domElement.removeEventListener('wheel',wheel);dropGhost();if(scene)disposeGeometry(scene);gardenContours?.dispose();gardenContours=undefined;renderer?.dispose();renderer=undefined;landscape=undefined;camera=undefined;scene=undefined;objects=undefined;land=undefined;viewport.replaceChildren();app.querySelector('#fps')!.textContent='— FPS';}
function changed(){save();if(style==='vector')refreshVector();else refreshPlants3d();refreshUI();redrawSelection();}
function refreshUI(){app.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(b=>b.classList.toggle('active',b.dataset.style===style));app.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(b=>{b.classList.toggle('active',!deleting&&b.dataset.kind===selected);b.title=b.dataset.kind===selected&&selectedSpeciesFamily!==undefined&&selected==='tree'?['Chêne','Bouleau','Conifère','Cyprès'][selectedSpeciesFamily]:'Sélectionner';});app.querySelector('#erase')!.classList.toggle('active',deleting);app.querySelector('#builder-select')!.classList.toggle('selected',editing);app.querySelector('#builder-plant')!.classList.toggle('selected',!editing&&!deleting);(app.querySelector('#builder-undo') as HTMLButtonElement).disabled=undoStack.length===0;(app.querySelector('#builder-redo') as HTMLButtonElement).disabled=redoStack.length===0;const picked=plants.find(p=>p.id===pickedId);(app.querySelector('#builder-picked') as HTMLElement).hidden=!editing||!picked;app.querySelector('#builder-picked-name')!.textContent=picked?labels[picked.kind]+' #'+picked.id:'';app.querySelector('#counter')!.textContent=`${plants.length} éléments · sauvegarde locale`;app.querySelector('#scene-title')!.textContent=style==='lowpoly'?'01 — Low-poly':style==='organic'?'02 — Organique':'03 — Vectoriel';app.querySelector('#scene-description')!.textContent=style==='lowpoly'?'Des volumes francs, une nature simple et lumineuse.':style==='organic'?'Des volumes adoucis, une végétation plus généreuse.':'Des formes illustrées et des couleurs en aplats.';app.querySelector('#hint')!.textContent=editing?'Sélection : clic sur un élément, puis glisser pour déplacer':style==='vector'?'Clic pour planter':'Glisser pour tourner · Molette pour zoomer · Clic pour planter';app.querySelector('#density')!.setAttribute('aria-pressed',String(dense));app.querySelector('#density')!.setAttribute('title',dense?'Retirer les ajouts de densité':'Densifier le jardin');}
function changeStyle(s:Style){if(style===s)return;dispose();style=s;if(s==='vector')initVector();else init3d();refreshUI();}
app.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(b=>b.onclick=()=>changeStyle(b.dataset.style as Style));
app.querySelector<HTMLButtonElement>('#erase')!.onclick=()=>{deleting=!deleting;editing=false;pickedId=undefined;refreshUI();updateGhost();};
app.querySelector<HTMLButtonElement>('#builder-plant')!.onclick=()=>{editing=false;deleting=false;pickedId=undefined;refreshUI();updateGhost();};
app.querySelector<HTMLButtonElement>('#builder-select')!.onclick=()=>{editing=true;deleting=false;refreshUI();updateGhost();};
app.querySelector<HTMLButtonElement>('#builder-undo')!.onclick=doUndo;
app.querySelector<HTMLButtonElement>('#builder-redo')!.onclick=doRedo;
app.querySelector<HTMLButtonElement>('#builder-rotate')!.onclick=()=>{const p=plants.find(p=>p.id===pickedId);if(!p)return;record(snapshot());p.rotation=(p.rotation??0)+Math.PI/4;changed();};
app.querySelector<HTMLButtonElement>('#builder-variant')!.onclick=()=>{const p=plants.find(p=>p.id===pickedId);if(!p||p.kind==='pond')return;record(snapshot());p.seed+=p.kind==='tree'||p.kind==='sapling'?4:1;changed();};
app.querySelector<HTMLButtonElement>('#builder-remove')!.onclick=()=>{if(pickedId===undefined)return;record(snapshot());plants=plants.filter(p=>p.id!==pickedId);pickedId=undefined;changed();};
app.querySelector<HTMLButtonElement>('#reset')!.onclick=()=>{record(snapshot());plants=seedGarden.map(p=>({...p}));dense=false;densityIds.clear();nextId=Math.max(0,...plants.map(p=>p.id))+1;changed();};
app.querySelector<HTMLButtonElement>('#home')!.onclick=()=>{yaw=Math.PI/4;pitch=.89;if(camera)camera.zoom=1;updateCamera();};
app.querySelector<HTMLButtonElement>('#density')!.onclick=()=>{record(snapshot());dense=!dense;if(dense){for(let i=0;i<110;i++){
  // Dense planting happens in woodland edges and meadow beds, not uniformly.
  const a=i*2.399963229728653, ring=Math.sqrt((i%37)/37);
  const zones=[[-3.15,-2.6,1.45],[3.25,-2.4,1.30],[-2.75,3.05,1.35],[3.05,2.95,1.25]];
  const [cx,cz,radius]=zones[i%zones.length];
  const x=Math.max(-4.8,Math.min(4.8,cx+Math.cos(a)*ring*radius));
  const z=Math.max(-4.8,Math.min(4.8,cz+Math.sin(a)*ring*radius));
  // Keep broadleaf saplings sparse; crowding the water hid the shoreline.
  const kind:Kind=i%23===0?'sapling':i%17===0?'rock':i%4===0?'bush':'flower';
  // Leave a breathing area around the pond and its nearest paths.
  if(nearWater(x,z,1.65))continue;
  densityIds.add(nextId);plants.push({id:nextId++,kind,x,z,seed:i+100});
 }}else{plants=plants.filter(p=>!densityIds.has(p.id));densityIds.clear();}changed();};
// Botanical workshop: isolated renderer, same procedural plant builders as the garden.
// Species records specify the seed family; variations change only the procedural seed.
type SpeciesRecord={id:string;name:string;group:string;kind:Kind;family:number;description:string;habitat:string};
const speciesCatalog:SpeciesRecord[]=[
 {id:'oak',name:'Chêne',group:'Arbres',kind:'tree',family:0,description:'Large houppier asymétrique et branches étalées. Une silhouette qui structure le jardin.',habitat:'Boisement · mi-ombre'},
 {id:'birch',name:'Bouleau',group:'Arbres',kind:'tree',family:1,description:'Tronc clair, feuillage léger et couronne plus aérée.',habitat:'Lisière · soleil'},
 {id:'pine',name:'Conifère',group:'Arbres',kind:'tree',family:2,description:'Une silhouette verticale et persistante, plus graphique que les feuillus.',habitat:'Sol drainé · soleil'},
 {id:'cypress',name:'Cyprès',group:'Arbres',kind:'tree',family:3,description:'Une ponctuation étroite et élancée pour rythmer la composition.',habitat:'Sol drainé · soleil'},
 {id:'young',name:'Jeune arbre',group:'Arbres',kind:'sapling',family:1,description:'Jeunes chênes, bouleaux, conifères et cyprès selon la variante.',habitat:'Lisière'},
 {id:'shrub',name:'Arbuste',group:'Sous-bois',kind:'bush',family:0,description:'Masses arrondies et feuillage dense pour relier arbres et prairie.',habitat:'Lisière · sous-bois'},
 {id:'fern',name:'Fougère',group:'Sous-bois',kind:'fern',family:0,description:'Frondes arquées et folioles étagées. La silhouette du sous-bois.',habitat:'Sol frais · mi-ombre'},
 {id:'flower',name:'Fleurs sauvages',group:'Prairie',kind:'flower',family:0,description:'Petites floraisons claires rassemblées en touffes naturelles.',habitat:'Prairie · soleil'},
 {id:'rock',name:'Roche',group:'Minéraux',kind:'rock',family:0,description:'Pierre facettée aux volumes simples et aux teintes minérales.',habitat:'Partout'},
 {id:'pond',name:'Mare',group:'Eau',kind:'pond',family:0,description:'Une surface d’eau calme aux berges irrégulières.',habitat:'Terrain humide'},
];
const builderSpecies=app.querySelector<HTMLElement>('#builder-species')!;
const builderEntries=speciesCatalog.filter(entry=>entry.kind==='tree'||entry.kind==='sapling');
builderSpecies.innerHTML=builderEntries.map(entry=>`<button data-build-species="${entry.id}">${entry.name}</button>`).join('');
builderSpecies.querySelectorAll<HTMLButtonElement>('[data-build-species]').forEach(btn=>btn.onclick=()=>{
 const entry=builderEntries.find(item=>item.id===btn.dataset.buildSpecies)!;
 selected=entry.kind;selectedSpeciesFamily=entry.family;editing=false;deleting=false;pickedId=undefined;
 builderSpecies.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===btn));refreshUI();updateGhost();
});
window.addEventListener('keydown',e=>{
 if((e.target as HTMLElement)?.matches('input, textarea, select, [contenteditable]'))return;
 if(document.body.classList.contains('botany-open'))return;
 if((e.ctrlKey||e.metaKey)&&!e.altKey){
  if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?doRedo():doUndo();}
  if(e.key.toLowerCase()==='y'){e.preventDefault();doRedo();}
 }else if(e.key.toLowerCase()==='r'&&!e.repeat){
  const p=editing?plants.find(item=>item.id===pickedId):undefined;
  if(p){record(snapshot());p.rotation=(p.rotation??0)+Math.PI/4;changed();}
  else if(!editing){brushRotation+=Math.PI/4;updateGhost();}
 }
});
const botanyPanel=app.querySelector<HTMLElement>('#botany')!;
const botanicalList=app.querySelector<HTMLElement>('#botany-list')!;
const variantBar=app.querySelector<HTMLElement>('#botany-variants')!;
let botanicalSpecies=speciesCatalog[0],botanicalVariant=0;
let botanicalRenderer:THREE.WebGLRenderer|undefined,botanicalScene:THREE.Scene|undefined,botanicalCamera:THREE.PerspectiveCamera|undefined,botanicalGroup:THREE.Group|undefined;
let botanicalContours:ContourRenderer|undefined;
let botanicalAzimuth=.66, botanicalElevation=.36, botanicalAimY=1, botanicalDistance=6.8,botanicalFrame=0,botanicalDrag=false,botanicalX=0,botanicalY=0;
const botanicalTarget=app.querySelector<HTMLElement>('#botany-canvas')!;
function botanicalSeed(species:SpeciesRecord,variant:number){
 if(species.kind==='sapling')return variant*4+(variant%4);
 return (variant*16+4+species.family)%256;
}
function updateBotanicalCamera(){if(!botanicalCamera)return;botanicalCamera.position.set(Math.sin(botanicalAzimuth)*Math.cos(botanicalElevation)*botanicalDistance,Math.sin(botanicalElevation)*botanicalDistance+botanicalAimY,Math.cos(botanicalAzimuth)*Math.cos(botanicalElevation)*botanicalDistance);botanicalCamera.lookAt(0,botanicalAimY,0);}
function resizeBotanical(){if(!botanicalRenderer||!botanicalCamera)return;const w=botanicalTarget.clientWidth,h=botanicalTarget.clientHeight;if(w<2||h<2)return;botanicalRenderer.setSize(w,h,false);botanicalCamera.aspect=w/h;botanicalCamera.updateProjectionMatrix();}
function renderBotanical(){if(!botanicalRenderer||!botanicalScene||!botanicalCamera)return;updateWater();botanicalContours?.render(botanicalScene,botanicalCamera);botanicalFrame=requestAnimationFrame(renderBotanical);}
function selectBotanical(species:SpeciesRecord,variant=0){
 botanicalSpecies=species;botanicalVariant=variant;
 app.querySelector('#botany-name')!.textContent=species.name;
 app.querySelector('#botany-desc')!.textContent=species.description;
 app.querySelector('#botany-facts')!.textContent=`${species.group} · ${species.habitat}`;
 app.querySelector('#species-position')!.textContent=`${speciesCatalog.indexOf(species)+1} / ${speciesCatalog.length}`;
 const note=app.querySelector<HTMLTextAreaElement>('#botany-review-note')!;
 note.value=localStorage.getItem('komorebi-review-'+species.id)??'';
 note.oninput=()=>localStorage.setItem('komorebi-review-'+species.id,note.value);
 botanicalList.innerHTML=speciesCatalog.map(entry=>`<button data-species="${entry.id}" class="${entry.id===species.id?'active':''}">${entry.name}<span>${entry.group}</span></button>`).join('');
 botanicalList.querySelectorAll<HTMLButtonElement>('[data-species]').forEach(b=>b.onclick=()=>selectBotanical(speciesCatalog.find(entry=>entry.id===b.dataset.species)!,0));
 variantBar.innerHTML=Array.from({length:6},(_,i)=>`<button data-variant="${i}" class="${i===variant?'active':''}">Variante ${String(i+1).padStart(2,'0')}</button>`).join('');
 variantBar.querySelectorAll<HTMLButtonElement>('[data-variant]').forEach(b=>b.onclick=()=>selectBotanical(species,Number(b.dataset.variant)));
 if(!botanicalScene)return;
 if(botanicalGroup){botanicalScene.remove(botanicalGroup);disposeGeometry(botanicalGroup);}
 botanicalGroup=buildPlant({id:-1,kind:species.kind,x:0,z:0,seed:botanicalSeed(species,variant)});
 // Plant builders use garden coordinates; normalize them to the studio plinth.
 botanicalGroup.position.set(0,.015,0);
 // Visual scale is independent of world scale: compare silhouettes comfortably.
 const previewScale=species.kind==='flower'?1.7:species.kind==='bush'?1.15:species.kind==='rock'?1.25:species.kind==='fern'?2.05:species.kind==='pond'?1.15:1;
 botanicalGroup.scale.multiplyScalar(previewScale);
 botanicalScene.add(botanicalGroup);if(botanicalRenderer)botanicalRenderer.shadowMap.needsUpdate=true;
 const bounds=new THREE.Box3().setFromObject(botanicalGroup);
 if(!bounds.isEmpty()){
  const center=bounds.getCenter(new THREE.Vector3());
  botanicalAimY=species.kind==='pond'?.15:center.y;
  const halfFov=THREE.MathUtils.degToRad(botanicalCamera!.fov)*.5;
  const limitingFov=Math.min(halfFov,Math.atan(Math.tan(halfFov)*botanicalCamera!.aspect));
  const radius=bounds.getBoundingSphere(new THREE.Sphere()).radius;
  botanicalDistance=Math.max(4.6,radius/Math.sin(limitingFov)*1.12);
  botanicalElevation=.33;updateBotanicalCamera();
 }
}
function openBotanical(){
 botanyPanel.hidden=false;
 document.body.classList.add('botany-open');
 if(!botanicalRenderer){
  botanicalRenderer=new THREE.WebGLRenderer({antialias:true,alpha:true});configureRenderer(botanicalRenderer);botanicalContours=new ContourRenderer(botanicalRenderer);botanicalTarget.append(botanicalRenderer.domElement);
  botanicalScene=new THREE.Scene();addDaylight(botanicalScene,true);applySunPreset(botanicalScene,sunPreset,botanicalRenderer);
  botanicalCamera=new THREE.PerspectiveCamera(36,1,.1,100);
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.57,.18,48),new THREE.MeshStandardMaterial({color:0xc9c5ad,roughness:1}));plinth.position.y=-.14;botanicalScene.add(plinth);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(1.55,64),new THREE.MeshStandardMaterial({color:0x96ad61,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=.005;floor.receiveShadow=true;botanicalScene.add(floor);
  const canvas=botanicalRenderer.domElement;canvas.style.touchAction='none';
  canvas.addEventListener('pointerdown',e=>{botanicalDrag=true;botanicalX=e.clientX;botanicalY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointerup',()=>botanicalDrag=false);
  canvas.addEventListener('pointermove',e=>{if(!botanicalDrag)return;botanicalAzimuth+=(e.clientX-botanicalX)*.008;botanicalElevation=THREE.MathUtils.clamp(botanicalElevation+(e.clientY-botanicalY)*.006,-.15,1.3);botanicalX=e.clientX;botanicalY=e.clientY;updateBotanicalCamera();});
  canvas.addEventListener('wheel',e=>{e.preventDefault();botanicalDistance=THREE.MathUtils.clamp(botanicalDistance+Math.sign(e.deltaY)*.5,2.5,16);updateBotanicalCamera();},{passive:false});
 }
 resizeBotanical();updateBotanicalCamera();selectBotanical(botanicalSpecies,botanicalVariant);cancelAnimationFrame(botanicalFrame);renderBotanical();
}
function closeBotanical(){lastFrame=performance.now();frames=0;botanyPanel.hidden=true;document.body.classList.remove('botany-open');cancelAnimationFrame(botanicalFrame);}
app.querySelector<HTMLButtonElement>('#botany-open')!.onclick=openBotanical;
app.querySelector<HTMLButtonElement>('#botany-close')!.onclick=closeBotanical;
function moveSpecies(direction:number){const index=speciesCatalog.indexOf(botanicalSpecies);selectBotanical(speciesCatalog[(index+direction+speciesCatalog.length)%speciesCatalog.length],0);}
app.querySelector<HTMLButtonElement>('#species-prev')!.onclick=()=>moveSpecies(-1);
app.querySelector<HTMLButtonElement>('#species-next')!.onclick=()=>moveSpecies(1);
app.querySelector<HTMLButtonElement>('#botany-copy-note')!.onclick=async()=>{
 const text=`Komorebi · ${botanicalSpecies.name} · Variante ${botanicalVariant+1} · ${SUN_PRESETS[sunPreset].name}\n${app.querySelector<HTMLTextAreaElement>('#botany-review-note')!.value}`;
 try{await navigator.clipboard.writeText(text);}catch{window.prompt('Copie cette fiche :',text);}
};
app.querySelector<HTMLButtonElement>('#botany-plant')!.onclick=()=>{editing=false;pickedId=undefined;selected=botanicalSpecies.kind;selectedSpeciesFamily=botanicalSpecies.kind==='tree'||botanicalSpecies.kind==='sapling'?botanicalSpecies.family:undefined;deleting=false;closeBotanical();refreshUI();};
window.addEventListener('resize',()=>{if(!botanyPanel.hidden)resizeBotanical();});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!botanyPanel.hidden)closeBotanical();});

window.addEventListener('resize',resize);init3d();refreshUI();chooseSun('clear');

if(reviewParams.has('review'))Object.assign(window,{
 __komorebiReview:{
  study:(detail:boolean,contours:boolean)=>{surfaceStudy.value=detail?1:0;if(gardenContours)gardenContours.strength=contours?.20:0;if(botanicalContours)botanicalContours.strength=contours?.20:0;},
  metrics:()=>({calls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles,
   geometries:renderer?.info.memory.geometries,textures:renderer?.info.memory.textures,
   programs:renderer?.info.programs?.length,contours: gardenContours?.supported,contoursEnabled:!!gardenContours?.strength,plants:plants.length,waterTime:waterTime.value}),
  project:(x:number,z:number,y=groundHeight(x,z))=>{
   if(!camera||!renderer)throw Error('Garden camera unavailable');
   const point=new THREE.Vector3(x,y,z).project(camera),rect=renderer.domElement.getBoundingClientRect();
   return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};
  },
 }
});
