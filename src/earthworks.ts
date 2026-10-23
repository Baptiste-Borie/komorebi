import * as THREE from 'three';
import {configureRenderer,addDaylight,studioBackground} from './rendering/Lighting';
import {styleSurface} from './rendering/SurfaceShader';

// Heightfield is kept separate from its editor and renderer. All measurements
// are in garden units; later a character can issue exactly the same strokes.
type Action = 'dig'|'fill'|'level';
const RES=81, SIZE=11, STEP=SIZE/(RES-1), LIMIT=1.65, KEY='komorebi-earthworks-v1';
const clamp=THREE.MathUtils.clamp;
const naturalHeight=(x:number,z:number)=> .13*Math.sin(x*.6+.5)*Math.cos(z*.7)+.075*Math.sin(x*1.4+z*.9)+.035*Math.cos(z*2.1-x*.5);
class Earth {
 heights=new Float32Array(RES*RES);
 worked=new Float32Array(RES*RES);
 index(i:number,j:number){return j*RES+i;}
 height(x:number,z:number){
  const u=clamp((x+SIZE/2)/STEP,0,RES-1.00001),v=clamp((z+SIZE/2)/STEP,0,RES-1.00001);
  const i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j;
  const h=(ii:number,jj:number)=>this.heights[this.index(ii,jj)];
  return naturalHeight(x,z)+(1-b)*((1-a)*h(i,j)+a*h(i+1,j))+b*((1-a)*h(i,j+1)+a*h(i+1,j+1));
 }
 stroke(x:number,z:number,action:Action,target:number){
  // The fixed .53 radius represents a hand tool, not an adjustable brush.
  const radius=.53, amount=.11;
  const i0=Math.max(0,Math.floor((x-radius+SIZE/2)/STEP));
  const i1=Math.min(RES-1,Math.ceil((x+radius+SIZE/2)/STEP));
  const j0=Math.max(0,Math.floor((z-radius+SIZE/2)/STEP));
  const j1=Math.min(RES-1,Math.ceil((z+radius+SIZE/2)/STEP));
  let changed=false;
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
   const dx=i*STEP-SIZE/2-x,dz=j*STEP-SIZE/2-z,d=Math.hypot(dx,dz);
   if(d>=radius)continue;
   const t=1-d/radius,fall=t*t*(3-2*t),k=this.index(i,j),before=this.heights[k];
   const surface=before+naturalHeight(i*STEP-SIZE/2,j*STEP-SIZE/2);
   const after=action==='dig'?before-amount*fall:action==='fill'?before+amount*fall:before+(target-surface)*Math.min(1,.31*fall);
   this.heights[k]=clamp(after,-LIMIT,LIMIT);
   if(Math.abs(this.heights[k]-before)>.0001){this.worked[k]=clamp(this.worked[k]+.16*fall,0,1);changed=true;}
  }
  return changed;
 }
 save(){try{localStorage.setItem(KEY,JSON.stringify({heights:Array.from(this.heights),worked:Array.from(this.worked)}));}catch(e){console.warn('Earthworks save unavailable',e);}}
 load(){try{const data=JSON.parse(localStorage.getItem(KEY)||'null');if(data?.heights?.length===RES*RES && data?.worked?.length===RES*RES){this.heights.set(data.heights.map((v:number)=>clamp(Number(v)||0,-LIMIT,LIMIT)));this.worked.set(data.worked.map((v:number)=>clamp(Number(v)||0,0,1)));}}catch(e){console.warn('Earthworks save invalid',e);}}
 reset(){this.heights.fill(0);this.worked.fill(0);this.save();}
}

export function openEarthworks(app:HTMLElement){
 if(document.getElementById('earthworks-root'))return;
 const root=document.createElement('section');root.id='earthworks-root';
 root.innerHTML=`<div class="earthworks-head"><div><small>KOMOREBI / EXPÉRIENCE TERRAIN</small><h2>Earthworks</h2></div><button id="earthworks-close">← Retour au jardin</button></div><div class="earthworks-viewport"></div><div class="earthworks-toolbar"><div class="earthworks-actions"><button data-earth="dig" class="active">↧ Creuser</button><button data-earth="fill">↥ Remplir</button><button data-earth="level">━ Aplatir</button></div><div class="earthworks-help">Clic maintenu : coups répétés · Déplacer : tracer · Clic droit : tourner · Molette : zoom</div><button id="earthworks-reset">Réinitialiser</button></div>`;
 app.append(root);
 const host=root.querySelector<HTMLElement>('.earthworks-viewport')!;
 const earth=new Earth();earth.load();
 let action:Action='dig',target=0;
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
 configureRenderer(renderer);
 host.append(renderer.domElement);
 const scene=new THREE.Scene();addDaylight(scene);scene.background=new THREE.Color(studioBackground);
 const geo=new THREE.PlaneGeometry(SIZE,SIZE,RES-1,RES-1);geo.rotateX(-Math.PI/2);
 // PlaneGeometry's vertical coordinate maps to negative world z after rotation.
 const colors=new Float32Array(RES*RES*3);
 const terrainMaterial=styleSurface(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:THREE.DoubleSide}),'ground');
 const ground=new THREE.Mesh(geo,terrainMaterial);ground.receiveShadow=true;scene.add(ground);
 const grass=new THREE.Color(0xa7c665),moss=new THREE.Color(0x65945b),warm=new THREE.Color(0xc3d57c),fresh=new THREE.Color(0x967858),subsoil=new THREE.Color(0x71573e);
 const pos=geo.getAttribute('position') as THREE.BufferAttribute;
 const update=()=>{
  for(let j=0;j<RES;j++)for(let i=0;i<RES;i++){
   const n=j*RES+i,x=pos.getX(n),z=pos.getZ(n);
   // Plane vertex row 0 lies at z=-SIZE/2 after rotation.
   pos.setY(n,naturalHeight(x,z)+earth.heights[n]);
   const height=earth.heights[n],worked=earth.worked[n];
   const t=clamp(.5+.12*Math.sin(x*1.05+z*.75)+.07*Math.cos(z*1.63-x*.48)+.025*Math.sin(x*2.8-z*3.1),0,1);
   const c=moss.clone().lerp(grass,t);
   c.lerp(warm,.28*Math.max(0,Math.sin(z*1.9+x*.7)));
   const soil=clamp(worked*.90+Math.max(0,-height)*.25,0,1);
   c.lerp(fresh.clone().lerp(subsoil,clamp(-height*.36,0,1)),soil);
   colors[n*3]=c.r;colors[n*3+1]=c.g;colors[n*3+2]=c.b;
  }
  pos.needsUpdate=true;geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  geo.computeVertexNormals();geo.computeBoundingSphere();geo.computeBoundingBox();
  if(typeof updateSkirt==='function')updateSkirt();
  renderer.shadowMap.needsUpdate=true;
 };
 // Continuous sidewalls follow the editable heightfield boundary: no floating grass sheet.
 const border:number[]=[];
 for(let i=0;i<RES;i++)border.push(i);
 for(let j=1;j<RES;j++)border.push(j*RES+RES-1);
 for(let i=RES-2;i>=0;i--)border.push((RES-1)*RES+i);
 for(let j=RES-2;j>0;j--)border.push(j*RES);
 const skirtGeo=new THREE.BufferGeometry();
 const skirtPos=new Float32Array(border.length*2*3);
 const skirtColors=new Float32Array(border.length*2*3);
 const skirtIndex:number[]=[];
 for(let k=0;k<border.length;k++){
  const v=k*2;const n=(k+1)%border.length*2;
  skirtIndex.push(v,n,v+1,n,n+1,v+1);
 }
 skirtGeo.setIndex(skirtIndex);
 skirtGeo.setAttribute('position',new THREE.BufferAttribute(skirtPos,3));
 skirtGeo.setAttribute('color',new THREE.BufferAttribute(skirtColors,3));
 const skirtMaterial=styleSurface(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:THREE.DoubleSide}),'ground');
 const skirt=new THREE.Mesh(skirtGeo,skirtMaterial);skirt.castShadow=true;skirt.receiveShadow=true;scene.add(skirt);
 const updateSkirt=()=>{
  for(let k=0;k<border.length;k++){
   const ix=border[k],px=pos.getX(ix),pz=pos.getZ(ix),py=pos.getY(ix);
   const o=k*6;skirtPos.set([px,py-.012,pz,px,-.88,pz],o);
   const top=new THREE.Color(0x779551),lower=new THREE.Color(0x907557);
   skirtColors.set([top.r,top.g,top.b,lower.r,lower.g,lower.b],o);
  }
  skirtGeo.attributes.position.needsUpdate=true;skirtGeo.attributes.color.needsUpdate=true;
  skirtGeo.computeVertexNormals();skirtGeo.computeBoundingSphere();
 };
 update();
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xd3dec8,roughness:1}));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=-.885;shadow.receiveShadow=true;scene.add(shadow);
 const camera=new THREE.PerspectiveCamera(42,1,.1,100);
 let azimuth=.75,elevation=.75,zoom=17,orbit=false,painting=false,lastX=0,lastY=0;
 let lastPoint:THREE.Vector3|null=null;
 const updateCamera=()=>{camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*zoom,Math.sin(elevation)*zoom,Math.cos(azimuth)*Math.cos(elevation)*zoom);camera.lookAt(0,0,0);};updateCamera();
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 const hit=(e:PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObject(ground)[0]?.point||null;};
 // One procedural low-poly hand tool. Its animation is the source of truth for terrain edits.
 const wood=new THREE.MeshStandardMaterial({color:0x927147,roughness:.96});
 const steel=new THREE.MeshStandardMaterial({color:0x879896,roughness:.72,metalness:.16,flatShading:true});
 const soilMat=new THREE.MeshStandardMaterial({color:0x876344,roughness:1,flatShading:true});
 const shovel=new THREE.Group();
 const handle=new THREE.Mesh(new THREE.CylinderGeometry(.021,.029,.66,7),wood);handle.position.y=.44;
 const neck=new THREE.Mesh(new THREE.CylinderGeometry(.033,.038,.13,7),steel);neck.position.y=.065;
 // Spade-shaped scoop: rounded shoulders, pointed working edge and slight concavity.
 const outline=new THREE.Shape();
 outline.moveTo(-.135,.025);outline.lineTo(.135,.025);outline.lineTo(.128,-.10);
 outline.quadraticCurveTo(.10,-.23,0,-.31);outline.quadraticCurveTo(-.10,-.23,-.128,-.10);outline.closePath();
 const bladeGeo=new THREE.ExtrudeGeometry(outline,{depth:.024,bevelEnabled:true,bevelThickness:.012,bevelSize:.008,bevelSegments:1,curveSegments:3});
 const blade=new THREE.Mesh(bladeGeo,steel);blade.rotation.x=-.30;
 const grip=new THREE.Group();
 const gripLeft=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.17,6),wood);gripLeft.position.set(-.105,.83,0);
 const gripRight=gripLeft.clone();gripRight.position.x=.105;
 const gripTop=new THREE.Mesh(new THREE.CylinderGeometry(.023,.023,.22,7),wood);gripTop.rotation.z=Math.PI/2;gripTop.position.y=.915;
 grip.add(gripLeft,gripRight,gripTop);shovel.add(handle,neck,blade,grip);
 scene.add(shovel);shovel.visible=false;
 const carried=new THREE.Group();
 for(let i=0;i<3;i++){
  const clod=new THREE.Mesh(new THREE.DodecahedronGeometry(.055+i*.008,0),soilMat);
  clod.position.set((i-1)*.06,-.10,-.042);carried.add(clod);
 }
 shovel.add(carried);carried.visible=false;
 // Translucent circular footprint appears only while the tool is active.
 const markerMaterial=new THREE.MeshBasicMaterial({color:0xeee8bc,transparent:true,opacity:.48,depthWrite:false});
 const marker=new THREE.Mesh(new THREE.TorusGeometry(.48,.008,3,48),markerMaterial);
 marker.rotation.x=-Math.PI/2;marker.renderOrder=9;scene.add(marker);marker.visible=false;
 type Cycle={mode:Action;x:number;z:number;target:number;start:number;duration:number;applied:boolean};
 let cycle:Cycle|null=null;let lastCompleted=-1000;
 const particles:{mesh:THREE.Mesh;velocity:THREE.Vector3;birth:number;mode:Action}[]=[];
 const particleMaterial=new THREE.MeshStandardMaterial({color:0x967455,roughness:1});
 const spawnParticles=(x:number,z:number,now:number,mode:Action)=>{
  for(let i=0;i<(mode==='level'?3:7);i++){
   const mesh=new THREE.Mesh(new THREE.DodecahedronGeometry(.019+(i%3)*.011,0),particleMaterial);
   const angle=i*2.399+now*.00015;
   mesh.position.set(x+Math.cos(angle)*.06,earth.height(x,z)+.035,z+Math.sin(angle)*.06);scene.add(mesh);
   const speed=mode==='fill'?.35:.50;
   particles.push({mesh,velocity:new THREE.Vector3(Math.sin(angle)*speed,.6+(i%4)*.15,Math.cos(angle)*speed),birth:now,mode});
  }
 };
 const startCycle=(now:number)=>{
  if(!painting||!lastPoint||cycle)return;
  const duration=action==='dig'?780:action==='fill'?690:460;
  cycle={mode:action,x:lastPoint.x,z:lastPoint.z,target,duration,start:now,applied:false};
  shovel.visible=true;
 };
 const applyCycle=(current:Cycle,now:number)=>{
  if(earth.stroke(current.x,current.z,current.mode,current.target)){
   update();spawnParticles(current.x,current.z,now,current.mode);
  }
 };
 const canvas=renderer.domElement;canvas.style.touchAction='none';
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 const down=(e:PointerEvent)=>{
  if(e.button!==0&&e.button!==2)return;
  canvas.setPointerCapture(e.pointerId);lastX=e.clientX;lastY=e.clientY;
  orbit=e.button===2;painting=e.button===0;
  if(painting){const p=hit(e);lastPoint=p?.clone()??null;target=p?earth.height(p.x,p.z):0;
   if(lastPoint)startCycle(performance.now());}
 };
 const move=(e:PointerEvent)=>{
  if(orbit){azimuth-=(e.clientX-lastX)*.008;elevation=clamp(elevation+(e.clientY-lastY)*.007,.25,1.48);updateCamera();}
  else if(painting){const p=hit(e);if(p)lastPoint=p.clone();}
  lastX=e.clientX;lastY=e.clientY;
 };
 const up=()=>{if(painting)earth.save();painting=false;orbit=false;lastPoint=null;marker.visible=false;};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
 canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 canvas.addEventListener('lostpointercapture',up);
 const wheel=(e:WheelEvent)=>{e.preventDefault();zoom=clamp(zoom*(e.deltaY>0?1.08:.92),8,31);updateCamera();};
 canvas.addEventListener('wheel',wheel,{passive:false});
 root.querySelectorAll<HTMLButtonElement>('[data-earth]').forEach(button=>button.onclick=()=>{action=button.dataset.earth as Action;root.querySelectorAll('[data-earth]').forEach(b=>b.classList.toggle('active',b===button));});
 root.querySelector<HTMLButtonElement>('#earthworks-reset')!.onclick=()=>{if(confirm('Remettre la parcelle à zéro ?')){earth.reset();update();}};
 let alive=true,frame=0;
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(w<2||h<2)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const loop=(now:number)=>{if(!alive)return;frame=requestAnimationFrame(loop);
  if(painting&&!cycle&&now-lastCompleted>40)startCycle(now);
  marker.visible=painting&&!!lastPoint;
  if(marker.visible&&lastPoint){marker.position.set(lastPoint.x,earth.height(lastPoint.x,lastPoint.z)+.022,lastPoint.z);}
  if(cycle){
   const c=cycle,t=clamp((now-c.start)/c.duration,0,1);
   const floorY=earth.height(c.x,c.z),ease=(v:number)=>v*v*(3-2*v);
   // Each action uses its own physical gesture. The tip follows the live floor depth.
   shovel.position.set(c.x,floorY+.29,c.z);
   shovel.rotation.set(0,azimuth+.6,0);
   if(c.mode==='dig'){
    // Enter soil -> lever -> lift loaded scoop -> empty to the side.
    shovel.position.y+=t<.23?.28*(1-ease(t/.23)):t<.52?-.16*Math.sin((t-.23)/.29*Math.PI):.28*ease((t-.52)/.48);
    shovel.position.x+=t>.56?.29*ease((t-.56)/.44):0;
    shovel.rotation.z=t<.32?-.35*ease(t/.32):t<.67?-.35+.85*ease((t-.32)/.35):.50-.55*ease((t-.67)/.33);
    carried.visible=t>.44&&t<.80;
   }else if(c.mode==='fill'){
    // Loaded spade arrives above the target and slowly tips to pour.
    shovel.position.y+=.28-(t<.40?.12*ease(t/.40):.12);
    shovel.rotation.z=t<.38?-.12:.95*ease(clamp((t-.38)/.42,0,1));
    carried.visible=t<.60;
   }else{
    // Back of the spade taps the ground to level, then rebounds.
    shovel.position.y+=.12+Math.abs(Math.cos(t*Math.PI*2))*.18;
    shovel.rotation.z=Math.PI*.52+.10*Math.sin(t*Math.PI*2);
    carried.visible=false;
   }
   const effectTime=c.mode==='dig'?.56:c.mode==='fill'?.74:.36;
   if(!c.applied&&t>=effectTime){applyCycle(c,now);c.applied=true;}
   if(t>=1){if(!c.applied)applyCycle(c,now);carried.visible=false;cycle=null;lastCompleted=now;
    earth.save();if(!painting)shovel.visible=false;}
  }else{shovel.visible=false;carried.visible=false;}
  for(let i=particles.length-1;i>=0;i--){const part=particles[i],age=(now-part.birth)/1000;
   if(age>.60){scene.remove(part.mesh);part.mesh.geometry.dispose();particles.splice(i,1);continue;}
   const dt=Math.min(.04,(now-lastRender)/1000);
   part.mesh.position.addScaledVector(part.velocity,dt);
   part.velocity.y-=3.5*dt;
   part.mesh.scale.setScalar(Math.max(0,1-age/.60));
  }
  lastRender=now;
  renderer.render(scene,camera);
 };let lastRender=performance.now();frame=requestAnimationFrame(loop);
 root.querySelector<HTMLButtonElement>('#earthworks-close')!.onclick=()=>{
  earth.save();alive=false;cancelAnimationFrame(frame);observer.disconnect();
  canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('wheel',wheel);
  for(const p of particles){scene.remove(p.mesh);p.mesh.geometry.dispose();}
  geo.dispose();skirtGeo.dispose();skirtMaterial.dispose();terrainMaterial.dispose();renderer.dispose();root.remove();
 };
}
