import { generateGarden, species } from './scene';
import { getStyle, styles, type StyleId } from './styles';
import { renderGarden } from './render';
import './lab.css';

type Verdict = 'promising' | 'review' | 'reject';
type Notes = Partial<Record<StyleId, { verdict?: Verdict; comment?: string }>>;
const storeKey = 'komorebi-graphic-lab-v001';
interface SavedState { style: StyleId; compare: boolean; against: StyleId; biodiversity: number; abundance: number; seed: number; animation: boolean; notes: Notes; }
const defaults: SavedState={style:'paper',compare:false,against:'ascii',biodiversity:10,abundance:46,seed:24680,animation:false,notes:{}};
function restore():SavedState {
 try {
  const raw=JSON.parse(localStorage.getItem(storeKey)||'null') as Partial<SavedState>|null;
  if(!raw)return {...defaults,notes:{}};
  const isStyle=(id:unknown):id is StyleId=>styles.some(s=>s.id===id);
  return {style:isStyle(raw.style)?raw.style:defaults.style,
   compare:raw.compare===true,against:isStyle(raw.against)?raw.against:defaults.against,
   biodiversity:Math.max(4,Math.min(species.length,Number(raw.biodiversity)||defaults.biodiversity)),
   abundance:Math.max(12,Math.min(110,Number(raw.abundance)||defaults.abundance)),
   seed:Number.isFinite(raw.seed)?Number(raw.seed):defaults.seed,
   animation:raw.animation===true,notes:raw.notes&&typeof raw.notes==='object'?raw.notes:{} };
 } catch{return {...defaults,notes:{}};}
}
const state=restore();
const persist=():void=>{try{localStorage.setItem(storeKey,JSON.stringify(state));}catch{/* navigation privée */}};
const root=document.querySelector<HTMLDivElement>('#app');
if(!root)throw new Error('Graphic Lab: #app introuvable');

root.innerHTML=`
 <div class="lab-shell">
  <aside class="lab-sidebar" aria-label="Styles disponibles">
   <div class="lab-brand"><div class="lab-logo" aria-hidden="true">✳</div><div><strong>KOMOREBI</strong><small>GRAPHIC LAB / 001</small></div></div>
   <div class="lab-rail-intro"><div class="lab-overline">RECHERCHE VISUELLE</div><h1>Un jardin.<br><em>Six regards.</em></h1><p>On compare des langages graphiques, pas des fonctionnalités. Même nature, même composition, six techniques.</p></div>
   <div class="lab-overline lab-list-caption">LES EXPÉRIENCES <span>06</span></div>
   <div class="style-list" id="style-list"></div>
   <div class="lab-sidebar-footer"><span class="status-pulse"></span><span>Prototype autonome · sans assets externes<br>Ancien projet conservé dans Git</span></div>
  </aside>
  <main class="lab-main">
    <header class="lab-topbar"><div class="topbar-title"><span class="lab-overline">ÉTUDE N° 001 <span class="topbar-slash">/</span> MONDE BOTANIQUE</span><strong id="current-title">Papier vivant</strong></div>
    <div class="topbar-actions"><label class="toggle-label"><input type="checkbox" id="comparison"/><span class="toggle-track"></span> Comparaison</label><button type="button" id="export" class="ghost-btn" title="Exporter les évaluations au format JSON">Exporter les notes ↗</button></div></header>
    <section class="preview-panel" aria-label="Prévisualisation du jardin">
      <div class="preview-topline"><span id="preview-caption">01 — PAPIER VIVANT</span><span class="stage-live"><span class="status-pulse"></span> SCÈNE GÉNÉRÉE</span></div>
      <div id="previews" class="previews"><div class="preview-slot"><canvas id="preview-a" aria-label="Vue du jardin avec le premier style"></canvas><div class="canvas-label" id="label-a">Papier vivant</div></div><div class="preview-slot comparison-slot" id="second-slot" hidden><canvas id="preview-b" aria-label="Vue du jardin avec le second style"></canvas><div class="canvas-label"><select id="against" aria-label="Style à comparer"></select></div></div></div>
      <div class="preview-foot"><span>CAMÉRA ORTHOGRAPHIQUE SIMULÉE · MÊMES COORDONNÉES</span><span id="frame-time">—</span></div>
    </section>
    <div class="lab-lower">
      <section class="control-panel"><header><div><span class="lab-overline">01 / TERRAIN D'ESSAI</span><h2>Changer la complexité</h2></div><button type="button" class="tiny-btn" id="reshuffle" title="Créer une autre composition">↻ Nouveau jardin</button></header>
        <p>Augmentons la diversité avant de décider qu'un style fonctionne.</p>
        <div class="slider-control"><div><label for="biodiversity">Biodiversité</label><output id="biodiversity-value">10 espèces</output></div><input id="biodiversity" type="range" min="4" max="14" step="1"/><div class="slider-foot"><span>4 espèces</span><span>14 espèces</span></div></div>
        <div class="slider-control"><div><label for="abundance">Abondance</label><output id="abundance-value">46 plantes</output></div><input id="abundance" type="range" min="12" max="110" step="2"/><div class="slider-foot"><span>12 sujets</span><span>110 sujets</span></div></div>
        <div class="presets"><button type="button" data-preset="clearing">Clairière</button><button type="button" data-preset="grove">Sous-bois</button><button type="button" data-preset="abundant">Forêt dense</button></div>
        <label class="motion-toggle"><input id="animation" type="checkbox"/> <span>Vent discret <small>Animation optionnelle pour comparer la performance</small></span></label>
      </section>
      <section class="assessment-panel"><div class="lab-overline">02 / ÉVALUATION</div><h2 id="assessment-title">Papier vivant</h2><p class="technique" id="technique"></p><div class="question" id="question"></div>
        <div class="lab-overline verdict-label">NOTRE VERDICT</div>
        <div class="verdicts" role="group" aria-label="Évaluation du style"><button type="button" data-verdict="promising">À retenir</button><button type="button" data-verdict="review">À creuser</button><button type="button" data-verdict="reject">À écarter</button></div>
        <label for="comment" class="note-label">Notes sur ce rendu</label><textarea id="comment" rows="3" placeholder="Silhouettes, lumière, performance, variété des plantes…"></textarea><small class="autosave">Enregistré localement dans ce navigateur.</small>
      </section>
    </div>
    <footer class="lab-bottom"><span id="species-readout">14 espèces définies</span><span>Pas de GLB, pas de rigging, pas de personnage</span><span>Construire peu. Comparer vite.</span></footer>
  </main>
 </div>`;

const $=<T extends HTMLElement>(selector:string):T=>{
 const item=root.querySelector<T>(selector);if(!item)throw new Error(`Graphic Lab: ${selector} introuvable`);return item;
};
const canvasA=$<HTMLCanvasElement>('#preview-a');
const canvasB=$<HTMLCanvasElement>('#preview-b');
const styleList=$<HTMLDivElement>('#style-list');
const selectB=$<HTMLSelectElement>('#against');
const biodiversity=$<HTMLInputElement>('#biodiversity');
const abundance=$<HTMLInputElement>('#abundance');
const animation=$<HTMLInputElement>('#animation');
const comparison=$<HTMLInputElement>('#comparison');
const comment=$<HTMLTextAreaElement>('#comment');
let garden=generateGarden(state.seed,state.biodiversity,state.abundance);
let dirty=true;
let currentFrameTime=0;
let lastFrame=0;

styles.forEach(s=>{
 const button=document.createElement('button');button.type='button';button.className='style-option';button.dataset.style=s.id;
 const swatches=s.palette.foliage.slice(0,3).map(c=>`<i style="background:${c}"></i>`).join('');
 button.innerHTML=`<span class="style-number">${s.number}</span><span class="style-copy"><strong>${s.name}</strong><small>${s.short}</small></span><span class="style-swatches" aria-hidden="true">${swatches}</span><span class="style-vote" aria-hidden="true"></span>`;
 button.addEventListener('click',()=>{state.style=s.id;dirty=true;refresh();});
 styleList.append(button);
 const option=document.createElement('option');option.value=s.id;option.textContent=s.name;selectB.append(option);
});

function rebuild():void {
 garden=generateGarden(state.seed,state.biodiversity,state.abundance);
 dirty=true;
 refresh();
}
function refresh():void {
 const s=getStyle(state.style);
 $('#current-title').textContent=s.name;
 $('#preview-caption').textContent=`${s.number} — ${s.name.toLocaleUpperCase('fr-FR')}`;
 $('#label-a').textContent=s.name;
 $('#assessment-title').textContent=s.name;
 $('#technique').textContent=s.technique;
 $('#question').textContent=s.question;
 biodiversity.value=String(state.biodiversity);abundance.value=String(state.abundance);
 $('#biodiversity-value').textContent=`${state.biodiversity} espèces`;
 $('#abundance-value').textContent=`${state.abundance} plantes`;
 $('#species-readout').textContent=`${species.length} espèces paramétrées · ${state.biodiversity} affichées · ${state.abundance} individus`;
 comparison.checked=state.compare;
 animation.checked=state.animation;
 selectB.value=state.against;
 const other=$<HTMLDivElement>('#second-slot');other.hidden=!state.compare;
 $('#previews').classList.toggle('is-comparing',state.compare);
 const selectedNotes=state.notes[state.style];
 comment.value=selectedNotes?.comment??'';
 $<HTMLDivElement>('.verdicts').querySelectorAll<HTMLButtonElement>('button').forEach(button=>{
  const active=button.dataset.verdict===selectedNotes?.verdict;
  button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
 });
 styleList.querySelectorAll<HTMLButtonElement>('.style-option').forEach(button=>{
   const id=button.dataset.style as StyleId;
   const current=button.dataset.style===state.style;
   button.classList.toggle('active',current);button.setAttribute('aria-pressed',String(current));
   const vote=button.querySelector<HTMLElement>('.style-vote');
   if(vote)vote.textContent=state.notes[id]?.verdict==='promising'?'✓':state.notes[id]?.verdict==='reject'?'×':state.notes[id]?.verdict==='review'?'•':'';
 });
 persist();
 dirty=true;
}

biodiversity.addEventListener('input',()=>{state.biodiversity=Number(biodiversity.value);rebuild();});
abundance.addEventListener('input',()=>{state.abundance=Number(abundance.value);rebuild();});
animation.addEventListener('change',()=>{state.animation=animation.checked;refresh();});
comparison.addEventListener('change',()=>{state.compare=comparison.checked;refresh();});
selectB.addEventListener('change',()=>{state.against=selectB.value as StyleId;refresh();});
$('#reshuffle').addEventListener('click',()=>{state.seed=(state.seed+7919)>>>0;rebuild();});
root.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
 const preset=button.dataset.preset;
 if(preset==='clearing'){state.biodiversity=5;state.abundance=18;}
 else if(preset==='grove'){state.biodiversity=10;state.abundance=46;}
 else {state.biodiversity=14;state.abundance=104;}
 rebuild();
}));
root.querySelectorAll<HTMLButtonElement>('[data-verdict]').forEach(button=>button.addEventListener('click',()=>{
 const verdict=button.dataset.verdict as Verdict;
 const prev=state.notes[state.style]??{};
 state.notes[state.style]={...prev,verdict:prev.verdict===verdict?undefined:verdict};
 refresh();
}));
comment.addEventListener('input',()=>{
 state.notes[state.style]={...(state.notes[state.style]??{}),comment:comment.value};
 persist();
});
$('#export').addEventListener('click',()=>{
 const data={project:'Komorebi — Graphic Lab 001',exportedAt:new Date().toISOString(),scene:{seed:state.seed,biodiversity:state.biodiversity,abundance:state.abundance},notes:styles.map(s=>({style:s.id,name:s.name,...state.notes[s.id]}))};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='komorebi-graphic-lab-001-notes.json';a.click();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
});

function resizeCanvas(canvas:HTMLCanvasElement):boolean{
 const b=canvas.getBoundingClientRect();
 if(b.width<1||b.height<1)return false;
 // Résolution plafonnée pour maintenir le test utilisable sur laptop.
 const width=Math.max(180,Math.round(b.width));const height=Math.max(160,Math.round(b.height));
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;dirty=true;}
 return true;
}
const observer=new ResizeObserver(()=>{dirty=true;});
observer.observe($<HTMLDivElement>('#previews'));
observer.observe(canvasA);observer.observe(canvasB);
function tick(time:number):void {
 if(dirty||(state.animation&&time-lastFrame>210)){
   const activeA=resizeCanvas(canvasA);
   const activeB=state.compare&&resizeCanvas(canvasB);
   if(activeA){
     currentFrameTime=renderGarden(canvasA,garden,getStyle(state.style),state.animation?time/1000:0);
     if(activeB)currentFrameTime+=renderGarden(canvasB,garden,getStyle(state.against),state.animation?time/1000:0);
     $('#frame-time').textContent=`${currentFrameTime.toFixed(0)} ms / rendu · ${garden.plants.length} sujets`;
     lastFrame=time;dirty=false;
   }
 }
 requestAnimationFrame(tick);
}
refresh();
requestAnimationFrame(tick);
