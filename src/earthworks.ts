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
 let azimuth=.75,elevation=.75,zoom=17,orbit=false,painting=false,lastX=0,lastY=0,lastStamp=0,lastPoint:THREE.Vector3|null=null;
 const updateCamera=()=>{camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*zoom,Math.sin(elevation)*zoom,Math.cos(azimuth)*Math.cos(elevation)*zoom);camera.lookAt(0,0,0);};updateCamera();
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 const hit=(e:PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObject(ground)[0]?.point||null;};
 const shovel=new THREE.Group();
 const handle=new THREE.Mesh(new THREE.CylinderGeometry(.018,.022,.61,6),new THREE.MeshStandardMaterial({color:0x95734c}));handle.position.y=.27;
 const blade=new THREE.Mesh(new THREE.ConeGeometry(.105,.26,5),new THREE.MeshStandardMaterial({color:0x83918e,metalness:.12,roughness:.75}));blade.rotation.z=Math.PI;blade.position.y=-.10;
 shovel.add(handle,blade);scene.add(shovel);shovel.visible=false;
 let impactAt=0;
 const particles:{mesh:THREE.Mesh;velocity:THREE.Vector3;birth:number}[]=[];
 const particleMaterial=new THREE.MeshStandardMaterial({color:0x967455,roughness:1});
 function impact(x:number,z:number,now:number){
  shovel.visible=true;shovel.position.set(x,earth.height(x,z)+.23,z);impactAt=now;
  for(let i=0;i<5;i++){
   const mesh=new THREE.Mesh(new THREE.DodecahedronGeometry(.022+(i%3)*.013,0),particleMaterial);
   mesh.position.set(x,earth.height(x,z)+.06,z);scene.add(mesh);
   const a=(i*2.399+now*.0009),speed=.6+(i%3)*.23;
   particles.push({mesh,velocity:new THREE.Vector3(Math.sin(a)*speed,1.2+i*.12,Math.cos(a)*speed),birth:now});
  }
 }
 const sculpt=(e:PointerEvent,now:number)=>{
  const p=hit(e);if(!p)return;
  lastPoint=p.clone();
  if(earth.stroke(p.x,p.z,action,target)){update();earth.save();impact(p.x,p.z,now);}
 };
 const canvas=renderer.domElement;canvas.style.touchAction='none';
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 const down=(e:PointerEvent)=>{if(e.button!==0&&e.button!==2)return;canvas.setPointerCapture(e.pointerId);lastX=e.clientX;lastY=e.clientY;orbit=e.button===2;painting=e.button===0;lastStamp=0;lastPoint=null;if(painting){const p=hit(e);if(p){target=earth.height(p.x,p.z);sculpt(e,performance.now());lastStamp=performance.now();}}};
 const move=(e:PointerEvent)=>{if(orbit){azimuth-=(e.clientX-lastX)*.008;elevation=clamp(elevation+(e.clientY-lastY)*.007,.25,1.48);updateCamera();}else if(painting && performance.now()-lastStamp>115){sculpt(e,performance.now());lastStamp=performance.now();}lastX=e.clientX;lastY=e.clientY;};
 const up=()=>{if(painting)earth.save();painting=false;orbit=false;lastPoint=null;};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);
 const wheel=(e:WheelEvent)=>{e.preventDefault();zoom=clamp(zoom*(e.deltaY>0?1.08:.92),8,31);updateCamera();};canvas.addEventListener('wheel',wheel,{passive:false});
 root.querySelectorAll<HTMLButtonElement>('[data-earth]').forEach(button=>button.onclick=()=>{action=button.dataset.earth as Action;root.querySelectorAll('[data-earth]').forEach(b=>b.classList.toggle('active',b===button));});
 root.querySelector<HTMLButtonElement>('#earthworks-reset')!.onclick=()=>{if(confirm('Remettre la parcelle à zéro ?')){earth.reset();update();}};
 let alive=true,frame=0;
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(w<2||h<2)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const loop=(now:number)=>{if(!alive)return;frame=requestAnimationFrame(loop);
  // Sustained press produces separate shovel impacts, even without mouse motion.
  if(painting&&lastPoint&&now-lastStamp>185){const x=lastPoint.x,z=lastPoint.z;if(earth.stroke(x,z,action,target)){update();earth.save();impact(x,z,now);}lastStamp=now;}
  if(shovel.visible){const t=(now-impactAt)/290;shovel.rotation.z=-.35+Math.sin(Math.min(t,1)*Math.PI)*.48;if(t>1.1)shovel.visible=false;}
  for(let i=particles.length-1;i>=0;i--){const part=particles[i],age=(now-part.birth)/1000;
   if(age>.54){scene.remove(part.mesh);part.mesh.geometry.dispose();particles.splice(i,1);continue;}
   part.mesh.position.x+=part.velocity.x/60;part.mesh.position.z+=part.velocity.z/60;
   part.mesh.position.y+=part.velocity.y/60;part.velocity.y-=.065;part.mesh.scale.setScalar(1-age/.54);
  }
  renderer.render(scene,camera);
 };frame=requestAnimationFrame(loop);
 root.querySelector<HTMLButtonElement>('#earthworks-close')!.onclick=()=>{
  earth.save();alive=false;cancelAnimationFrame(frame);observer.disconnect();
  canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('wheel',wheel);
  for(const p of particles){scene.remove(p.mesh);p.mesh.geometry.dispose();}
  geo.dispose();skirtGeo.dispose();skirtMaterial.dispose();terrainMaterial.dispose();renderer.dispose();root.remove();
 };
}
