import { checkRendering } from './review-rendering.mjs';
import { checkInteractions } from './review-checks.mjs';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, rm, rename, readdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const mode = process.argv.includes('--quick') ? 'quick' : process.argv.includes('--full') ? 'full' : 'standard';
const baseline=process.argv.includes('--baseline');
const limits = {quick:5, standard:7, full:25};
const staging = resolve('review-staging');
const output = resolve('reviews');
const port = 4178;
const url = `http://127.0.0.1:${port}`;
// Text fragments are capped to remain readable through the GitHub connector.
const chunkChars = 48000;
const quality = 86;
await rm(staging, {recursive:true,force:true});
await mkdir(staging,{recursive:true});
let browser;
let success = false;
const server = spawn('npm',['run','preview','--','--host','127.0.0.1','--port',String(port),'--strictPort'], {
  stdio:'ignore', detached:process.platform!=='win32',
});
const sleep = ms => new Promise(r=>setTimeout(r,ms));
try {
  let ready=false;
  for(let i=0;i<80;i++) {
    if(server.exitCode!==null)break;
    try {if((await fetch(url)).ok){ready=true;break;}}catch{}
    await sleep(250);
  }
  if(!ready)throw Error(`Serveur Vite inaccessible sur ${url}`);
  browser=await chromium.launch({headless:true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{}),
    ...(process.env.KOMOREBI_SOFTWARE_GL==='1'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{}),
  });
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const errors=[];
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(`${url}/?review=1&time=4`,{waitUntil:'networkidle'});
  const canvas=page.locator('#scene canvas');
  await canvas.waitFor({state:'visible'});
  await page.locator('#menu-toggle').click();
  await page.locator('#reset').click();
  await page.locator('#menu-toggle').click();
  await page.waitForTimeout(600);
  const checks=baseline?[]:await checkInteractions(page);
  if(!baseline)checks.push(...await checkRendering(page));
  const manifest={version:3,release:baseline?'0.22':'0.23',checks,mode,environment:{browser:browser.version(),softwareGL:process.env.KOMOREBI_SOFTWARE_GL==='1'},format:'WebP lossy, encoded as Base64',quality,chunkChars,images:[]};
  async function capture(name,wholePage=false) {
    const shot=await (wholePage?page:page.locator('#viewport')).screenshot({type:'png',animations:'disabled'});
    const bytes=await sharp(shot).webp({quality,effort:5}).toBuffer();
    const file=`${name}.webp`;
    const sha256=createHash('sha256').update(bytes).digest('hex');
    const base64=bytes.toString('base64');
    const parts=[];
    for(let at=0,i=1;at<base64.length;at+=chunkChars,i++){
      const part=`${name}.part-${String(i).padStart(3,'0')}.b64`;
      await writeFile(join(staging,part),base64.slice(at,at+chunkChars),'ascii');
      parts.push(part);
    }
    // Verify reconstruction locally before publishing.
    const reconstructed=Buffer.from((await Promise.all(parts.map(p=>readFile(join(staging,p),'ascii')))).join(''),'base64');
    if(!bytes.equals(reconstructed))throw Error(`Reconstruction Base64 incorrecte : ${file}`);
    await writeFile(join(staging,file),bytes);
    const metrics=wholePage?undefined:baseline?{hud:await page.locator('#fps').textContent()}:await page.evaluate(()=>window.__komorebiReview.metrics());
    manifest.images.push({file,bytes:bytes.length,sha256,parts,metrics});
    console.log(`✓ ${file}: ${(bytes.length/1024).toFixed(0)} Kio, ${parts.length} fragments`);
  }
  async function orbit(dx,dy){
    const box=await canvas.boundingBox();
    if(!box)throw Error('Canvas inaccessible');
    const x=box.x+box.width*.5,y=box.y+box.height*.5;
    await page.mouse.move(x,y);await page.mouse.down();
    await page.mouse.move(x+dx,y+dy,{steps:14});await page.mouse.up();
    await page.waitForTimeout(280);
  }
  async function zoom(steps){
    const box=await canvas.boundingBox();if(!box)throw Error('Canvas inaccessible');
    await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);
    for(let i=0;i<Math.abs(steps);i++)await page.mouse.wheel(0,steps>0?-100:100);
    await page.waitForTimeout(300);
  }
  async function home(){await page.locator('#home').click();await page.waitForTimeout(200);}
  const shots = [
    ['01-overview',async()=>home()],
    ['02-angle-left',async()=>{await home();await orbit(205,-15)}],
    ['03-angle-right',async()=>{await home();await orbit(-210,0)}],
    ['04-overhead',async()=>{await home();await orbit(0,110)}],
    ['05-close-overview',async()=>{await home();await zoom(3)}],
    ['06-tree-canopy',async()=>{await home();await orbit(-80,-15);await zoom(5)}],
    ['07-water-close',async()=>{await home();await orbit(60,65);await zoom(5)}],
    ['07-tree-profile',async()=>{await home();await orbit(250,-60);await zoom(5)}],
    ['08-conifer',async()=>{await home();await orbit(-160,-35);await zoom(4)}],
    ['09-shrubs',async()=>{await home();await orbit(110,20);await zoom(4)}],
    ['10-wildflowers',async()=>{await home();await orbit(-40,75);await zoom(5)}],
    ['11-water',async()=>{await home();await orbit(60,65);await zoom(5)}],
    ['12-path',async()=>{await home();await orbit(-100,55);await zoom(4)}],
    ['13-dense-overview',async()=>{await page.locator('#density').click();await home()}],
    ['14-dense-angle',async()=>{await home();await orbit(235,-10)}],
    ['15-dense-close',async()=>{await home();await zoom(4)}],
    ['16-dense-overhead',async()=>{await home();await orbit(0,100)}],
    ['17-dense-profile',async()=>{await home();await orbit(-230,-60)}],
    ['18-dense-alt',async()=>{await home();await orbit(135,40)}],
    ['19-dense-zoom',async()=>{await home();await orbit(100,60);await zoom(5)}],
    ['20-dense-isometric',async()=>{await home();await orbit(-80,-20)}],
    ['21-light-reverse',async()=>{await page.locator('#density').click();await home();await orbit(390,0)}],
    ['22-light-low-angle',async()=>{await home();await orbit(120,-100)}],
    ['23-light-close-alt',async()=>{await home();await orbit(-240,-35);await zoom(5)}],
    ['24-light-high-alt',async()=>{await home();await orbit(160,115)}],
    ['25-light-final',async()=>home()],
  ];
  const selection=baseline?[shots[0],shots[6],shots[13]]:mode==='full'?shots.slice(0,limits.full):mode==='quick'?[shots[0],shots[6],shots[13]]:[shots[0],shots[3],shots[6],shots[13],shots[15]];
  for(const [name,setup] of selection){
    await setup();await page.waitForTimeout(160);await capture(name);
  }
  // Botanical workshop snapshots: capture the whole application, not only the garden viewport.
  await page.locator('#botany-open').click();
  await page.waitForTimeout(400);
  const specimens=baseline?[['oak','botany-oak']]:mode==='quick'?[['oak','botany-oak'],['pond','botany-pond']]:[
    ['oak','botany-oak'],['pine','botany-conifer'],['fern','botany-fern'],['pond','botany-pond']
  ];
  for(const [id,name] of specimens){
    await page.locator(`[data-species="${id}"]`).click();
    await page.waitForTimeout(240);
    await capture(name,true);
  }
  await page.locator('#botany-close').click();
  console.log(`✓ ${checks.length} contrôles fonctionnels`);
  if(errors.length)throw Error(`Erreurs JavaScript : ${errors.join(' ; ')}`);
  await writeFile(join(staging,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  // Publish only the garden captures, never delete archives of other workshops.
  const oldManifest = await readFile(join(output,'manifest.json'),'utf8')
    .then(JSON.parse).catch(() => null);
  const safeName = name => typeof name === 'string' && /^[\w.-]+$/.test(name);
  const assetsIn = m => new Set((Array.isArray(m?.images) ? m.images : [])
    .flatMap(item => [item.file, ...(Array.isArray(item.parts) ? item.parts : [])])
    .filter(name => safeName(name) && /\.(webp|b64)$/.test(name)));
  const oldFiles = assetsIn(oldManifest), newFiles = assetsIn(manifest);
  await mkdir(output,{recursive:true});
  for (const name of await readdir(staging)) {
    if (!safeName(name)) throw new Error(`Nom de fichier inattendu : ${name}`);
    if (name !== 'manifest.json') await rename(join(staging,name),join(output,name));
  }
  await rename(join(staging,'manifest.json'),join(output,'manifest.json'));
  for (const name of oldFiles) if (!newFiles.has(name)) await rm(join(output,name),{force:true});
  await rm(staging,{recursive:true,force:true});
  success=true;
  console.log(`✓ Revue ${mode} : ${manifest.images.length} captures, autres ateliers préservés`);
} finally {
  await browser?.close();
  if(process.platform==='win32')server.kill();
  else {try{process.kill(-server.pid,'SIGTERM')}catch{server.kill();}}
  if(!success)await rm(staging,{recursive:true,force:true});
}
