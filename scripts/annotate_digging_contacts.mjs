/** Scientific figure composition: measured 3D witnesses over diagnostic renders. */
import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
const root=resolve('reviews/digging-contact-diagnostic');
const analysis=JSON.parse(await readFile(`${root}/analysis.json`));
const captureData=JSON.parse(await readFile(`${root}/captures.json`));
const phases=JSON.parse(await readFile(`${root}/phases.json`));
const candidateCaptures=[...new Map(captureData.captures.map(c=>[c.name,c])).values()];
const captures=[];
for(const c of candidateCaptures){
 let stats;
 try{stats=await sharp(`${root}/${c.name}-raw.png`).stats();}catch{continue;}
 // Workbench occasionally emits a fully black frame in background mode.
 // Exclude such a render from scientific figures; keep the measurement row.
 if(stats.channels.slice(0,3).every(s=>s.mean<1))continue;
 captures.push(c);
}
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const pct=x=>`${(100*x).toFixed(4)} % H`;
const names={baseline_synthetic:'Montage synthétique historique',legacy_zero_pitch:'Pelle atelier / angle 0°',legacy_pitch_175:'Montage témoin fixe / 175°'};
for(const c of captures){
 const raw=await readFile(`${root}/${c.name}-raw.png`);
 const stats=await sharp(raw).stats();
 if(stats.channels.slice(0,3).every(s=>s.mean<1))throw Error(`Blank render: ${c.name}`);
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="940" viewBox="0 0 1440 940"><rect width="1440" height="940" fill="#fafaf6"/><style>text{font-family:DejaVu Sans,sans-serif;fill:#26352f;font-size:17px}.small{font-size:14px}.title{font-size:25px;font-weight:bold}</style><text class="title" x="25" y="34">${escape(names[c.config])}</text><text x="25" y="66">t = ${c.time_s.toFixed(8)} s — ${c.percent.toFixed(3)} % du cycle — échantillon ${c.index}/142 — ${c.view}</text><image x="0" y="90" width="1000" height="800" href="data:image/png;base64,${raw.toString('base64')}"/>`;
 const coordinates=p=>[p[0],p[1]+90];
 const circle=(p,color,r=7)=>{const [x,y]=coordinates(p);return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="white" stroke-width="2"/>`;};
 const line=(a,b,color,dash='')=>{const [x1,y1]=coordinates(a),[x2,y2]=coordinates(b);return `<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="${dash}"/>`;};
 svg+=line(c.projected.l.slot,c.projected.l.reference,'#d29918','7 5');
 svg+=circle(c.projected.r.hand_centroid,'#cc423b',9)+circle(c.projected.l.hand_centroid,'#2470c1',9);
 svg+=circle(c.projected.l.slot,'#aa4d9b',5)+circle(c.projected.l.reference,'#d29918',6);
 for(const [side,key] of [['r','right'],['l','left']])if(c.row[`${key}_surface_shaft_gap_H`]>1e-7){
  svg+=line(c.projected[side].closest_hand_surface,c.projected[side].closest_shaft_surface,'#ef3636');
  svg+=circle(c.projected[side].closest_hand_surface,'#ef3636',5)+circle(c.projected[side].closest_shaft_surface,'#ef3636',5);
 }
 const text=[
  ['Mesures 3D (pas pixels)',true],
  ['Seuil conservé : 0,5000 % H'],
  [''],['Erreur de point fixe historique G'],[pct(c.row.historical_fixed_marker_error_H),true],
  [''],['Distance main D → volume manche'],[pct(c.row.right_surface_shaft_gap_H),true],
  ['Distance main G → volume manche'],[pct(c.row.left_surface_shaft_gap_H),true],
  [''],['Centre G → sa référence initiale'],[pct(c.row.left_hand_centroid_fixed_reference_error_H),true],
  [''],['Repères superposés en vue 3D'],['● Rouge : centre géométrique main D'],['● Bleu : centre géométrique main G'],
  ['● Violet : origine socket G'],['● Orange : référence fixe du test'],['Tirets : déplacement du socket G'],
  [''],['La référence du test est virtuelle.'],['Un socket ne définit pas une paume.'],
  ['Zéro au manche peut être une'],['intersection, pas une bonne prise.'],
  ['La capsule arrondit les extrémités.'],['Aucune courbe d’animation modifiée.'],
 ];
 text.forEach(([s,bold],i)=>{svg+=`<text x="1020" y="${115+i*27}" class="${bold?'':'small'}" style="font-weight:${bold?'bold':'normal'}">${escape(s)}</text>`;});
 svg+='<text x="25" y="922" class="small">Ranger original et Digging inchangés. Pelle de diagnostic, état de contact source non annoté. Les points restent visibles même lorsqu’ils sont occultés.</text></svg>';
 await writeFile(`${root}/${c.name}-annotated.svg`,svg);
 await sharp(Buffer.from(svg)).png().toFile(`${root}/${c.name}-annotated.png`);
}
await sharp(`${root}/temporal.svg`).png().toFile(`${root}/temporal.png`);
const configurations=Object.keys(analysis.configs);
const figures=captures.map(c=>`<figure><a href="${c.name}-annotated.png"><img src="${c.name}-annotated.png" loading="lazy" alt="${escape(names[c.config])}, ${c.time_s.toFixed(6)} secondes, ${c.view}"></a><figcaption>${escape(names[c.config])} · ${c.time_s.toFixed(6)} s · ${escape(c.reason)}</figcaption></figure>`).join('');
const page=`<!doctype html><html lang="fr"><meta charset="utf-8"><title>Digging : diagnostic des contacts</title><style>body{font:16px/1.55 system-ui;max-width:1250px;margin:30px auto;padding:0 20px;color:#26352f;background:#fafaf6}h1{font-size:30px}aside{padding:15px;border-left:5px solid #b16b21;background:#fff3d8}img{max-width:100%;height:auto}figure{margin:0}.gallery{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}figcaption{font-size:13px}a{color:#1d665b}table{width:100%;border-collapse:collapse;background:white}td,th{padding:8px;border:1px solid #ddd;text-align:left}.controls{position:sticky;top:0;padding:12px;background:#edf1eb;border:1px solid #bac7bc}input{width:50%}#metrics{font-variant-numeric:tabular-nums}.phase{padding:10px;border-bottom:1px solid #ccc}</style>
<h1>Les 5,14 % H ne prouvent pas un défaut de contact de Digging</h1>
<aside>La main droite reste rigidement liée au repère de l’outil. Le mouvement de la gauche est compatible avec un coulissement et un pivot, sans détachement intentionnel établi. Le montage initial et le critère de point fixe ne permettent pas de condamner l’animation. Le témoin à 175° garde les deux mains à proximité du manche, mais une intersection à distance nulle ne certifie pas une bonne prise. Aucun rigging v044 commencé.</aside>
<p><a href="../../docs/DIGGING_CONTACT_DIAGNOSIS.md">Diagnostic complet et recommandations</a> · <a href="analysis.json">Mesures, témoins 3D et dépassements</a> · <a href="phases.json">Phases</a> · <a href="native-samples.json.gz">Données natives</a></p>
<div class="controls"><label>Échantillon <input id="time" type="range" min="0" max="142" value="23"></label> <select id="config">${configurations.map(c=>`<option>${c}</option>`).join('')}</select><div id="metrics"></div></div>
<p>Le curseur consulte exactement les 143 instants ; il ne filtre aucune phase. Les passages continus de seuil sont encadrés dans le JSON, leurs interpolations sont des estimations.</p>
<img src="temporal.svg" alt="Quatre graphiques temporels séparant le point fixe, la distance au manche et le coulissement"><p><a href="temporal.svg">SVG exportable</a> · <a href="temporal.png">PNG exportable</a></p>
<h2>Lecture par phase — hypothèses visuelles, pas annotations d’auteur</h2>${phases.map(p=>`<div class="phase"><strong>${escape(p.name)} : ${p.start_s.toFixed(6)}–${p.end_s.toFixed(6)} s</strong><br>${escape(p.observation)}<br>Variation axiale du centre G : ${pct(p.metrics.l.axial_centroid_range_H)}. Aucune phase libre justifiée ni exclue.</div>`).join('')}
<h2>Instants exacts des dépassements échantillonnés</h2><p>Point fixe historique : 129 instants, 0,05599999745686848–1,3159999402364093 s ; maximum 0,23333333 s. Distance au volume du manche atelier 0° : 9 instants, 1,161999947230021–1,23333335 s ; maximum 1,20000005 s. Ces listes complètes sont dans les CSV :</p><ul>${configurations.map(c=>`<li><a href="${c}.csv">${c}.csv</a></li>`).join('')}</ul>
<h2>Captures annotées : maxima et phases</h2><p>Les annotations montrent les mesures 3D et distinguent centres de main, socket et référence fixe virtuelle. Les nouveaux rendus figent la peau évaluée à chaque pose ; l’écart maximal Blender/glTF des repères vaut ${(captureData.native_blender_alignment_max_H*100).toFixed(6)} % H.</p><div class="gallery">${figures}</div>
<script>const curves=${JSON.stringify(Object.fromEntries(configurations.map(c=>[c,analysis.configs[c].rows]))).replaceAll('<','\\u003c')};
const input=document.getElementById('time'),select=document.getElementById('config'),output=document.getElementById('metrics');function update(){const row=curves[select.value][+input.value];const p=x=>(100*x).toFixed(4)+' % H';output.textContent='t='+row.time_s.toFixed(9)+' s / '+row.percent.toFixed(3)+' % — point fixe G : '+p(row.historical_fixed_marker_error_H)+' — volume manche D : '+p(row.right_surface_shaft_gap_H)+' / G : '+p(row.left_surface_shaft_gap_H)+' — centre G fixé : '+p(row.left_hand_centroid_fixed_reference_error_H);}input.oninput=select.onchange=update;update();</script></html>`;
await writeFile(`${root}/index.html`,page);
console.log(`Composed ${captures.length} annotated scientific figures, temporal SVG/PNG and local interactive report.`);
