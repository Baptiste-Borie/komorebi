import * as THREE from 'three';
import {configureRenderer,addDaylight,studioBackground} from './rendering/Lighting';
import {type ShovelAction,CYCLE_DURATION} from './shovel';
import {makeGardener} from './gardener';

export function openShovelWorkshop(){
 if(document.querySelector('#shovel-workshop'))return;
 const root=document.createElement('section');root.id='shovel-workshop';
 root.innerHTML=`<header><div><small>KOMOREBI / ATELIER D'ANIMATION</small><h2>Les gestes de la pelle</h2></div><button id="shovel-workshop-close">✕ Fermer</button></header>
 <div class="shovel-workshop-stage"></div><footer><div class="shovel-workshop-actions"><button data-pose="dig" class="active">Creuser</button><button data-pose="fill">Remplir</button><button data-pose="level">Aplatir</button></div><button id="shovel-pause">Pause</button><label>Vitesse <input type="range" id="shovel-speed" min="0.2" max="1.5" step="0.1" value="0.7"></label><label>Pose <input type="range" id="shovel-scrub" min="0" max="100" step="1" value="0"></label><span id="shovel-phase">0 %</span><small>Glisser : tourner · Molette : zoomer</small></footer>`;
 document.body.append(root);const host=root.querySelector<HTMLElement>('.shovel-workshop-stage')!;
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});configureRenderer(renderer);host.append(renderer.domElement);
 const scene=new THREE.Scene();addDaylight(scene,true);scene.background=new THREE.Color(studioBackground);
 const floor=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.56,.20,48),new THREE.MeshStandardMaterial({color:0x9b8a6c,roughness:1}));floor.position.y=-.22;scene.add(floor);
 const lawn=new THREE.Mesh(new THREE.CircleGeometry(1.5,48),new THREE.MeshStandardMaterial({color:0x8eac62,roughness:1}));lawn.rotation.x=-Math.PI/2;lawn.position.y=-.11;scene.add(lawn);
 const actor=makeGardener();actor.group.position.y=-.09;scene.add(actor.group);
 const camera=new THREE.PerspectiveCamera(35,1,.1,50);
 let orbitAngle=.7,orbitElevation=.32,orbitDistance=5.8;
 const updateOrbit=()=>{camera.position.set(Math.sin(orbitAngle)*Math.cos(orbitElevation)*orbitDistance,1+Math.sin(orbitElevation)*orbitDistance,Math.cos(orbitAngle)*Math.cos(orbitElevation)*orbitDistance);camera.lookAt(0,1,0);};updateOrbit();
 let dragging=false,lastX=0,lastY=0;const canvas=renderer.domElement;canvas.style.touchAction='none';
 canvas.addEventListener('pointerdown',event=>{dragging=true;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture(event.pointerId);});
 canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
 canvas.addEventListener('pointermove',event=>{if(!dragging)return;orbitAngle-=(event.clientX-lastX)*.008;orbitElevation=THREE.MathUtils.clamp(orbitElevation+(event.clientY-lastY)*.005,-.05,1.25);lastX=event.clientX;lastY=event.clientY;updateOrbit();});
 canvas.addEventListener('wheel',event=>{event.preventDefault();orbitDistance=THREE.MathUtils.clamp(orbitDistance*(event.deltaY>0?1.10:.9),3.2,11);updateOrbit();},{passive:false});
 let mode:ShovelAction='dig',phase=0,running=true,speed=.7,previous=performance.now(),alive=true,frame=0;
 const slider=root.querySelector<HTMLInputElement>('#shovel-scrub')!;const phaseText=root.querySelector<HTMLElement>('#shovel-phase')!;
 const setPhase=(p:number)=>{phase=(p+1)%1;slider.value=String(Math.round(phase*100));phaseText.textContent=`${Math.round(phase*100)} %`;actor.pose(mode,phase);};
 root.querySelectorAll<HTMLButtonElement>('[data-pose]').forEach(button=>button.onclick=()=>{mode=button.dataset.pose as ShovelAction;root.querySelectorAll('[data-pose]').forEach(b=>b.classList.toggle('active',b===button));setPhase(0);});
 const pause=root.querySelector<HTMLButtonElement>('#shovel-pause')!;pause.onclick=()=>{running=!running;pause.textContent=running?'Pause':'Lecture';};
 root.querySelector<HTMLInputElement>('#shovel-speed')!.oninput=e=>speed=Number((e.target as HTMLInputElement).value);
 slider.oninput=e=>{running=false;pause.textContent='Lecture';setPhase(Number((e.target as HTMLInputElement).value)/100);};
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(w<2||h<2)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const loop=(now:number)=>{if(!alive)return;frame=requestAnimationFrame(loop);const dt=Math.min(60,now-previous);previous=now;if(running)setPhase(phase+dt*speed/CYCLE_DURATION[mode]);renderer.render(scene,camera);};setPhase(0);frame=requestAnimationFrame(loop);
 root.querySelector<HTMLButtonElement>('#shovel-workshop-close')!.onclick=()=>{alive=false;cancelAnimationFrame(frame);observer.disconnect();scene.traverse(object=>{if(object instanceof THREE.Mesh)object.geometry.dispose();});renderer.dispose();root.remove();};
}
