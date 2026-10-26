/** Verify that Komorebi loads and animates the delivered V0.44 Rig_Medium GLB. */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const url=process.env.KOMOREBI_URL ?? 'http://127.0.0.1:5173/?kaykit=1';
const out=resolve('reviews/v044-rig-medium/final/app');await mkdir(out,{recursive:true});
const captures=resolve('reviews/v044-rig-medium/final/captures');await mkdir(captures,{recursive:true});
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const ping=async()=>{try{return (await fetch(url,{signal:AbortSignal.timeout(1200)})).ok}catch{return false}};
let vite,browser;
try {
  if(!await ping()){
    vite=spawn(process.platform==='win32'?'npm.cmd':'npm',['run','dev','--','--host','127.0.0.1','--port','5173','--strictPort'],
      {cwd:resolve('.'),stdio:'ignore',detached:process.platform!=='win32'});
    for(let i=0;i<80&&!await ping();i++)await sleep(250);
    if(!await ping())throw new Error('Vite did not start');
  }
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#kaykit-lab[data-ready="true"]',{timeout:30000});
  const initial=await page.locator('#kaykit-lab').evaluate(el=>el.kaykitDiagnostics);
  console.log('KOMOREBI_V044_DIAGNOSTICS',JSON.stringify({gardener:initial?.gardener,embeddedDigging:initial?.embeddedDigging,
    meshCount:initial?.meshes?.length,meshNames:initial?.meshes?.map(mesh=>mesh.name)}));
  if(initial?.gardener!=='gardener-v044-rig-medium.glb'||initial?.embeddedDigging!==true)throw new Error('Delivered GLB or embedded Digging not active');
  // Three.js splits the two multi-material boot primitives, so 38 glTF meshes
  // become 40 renderable Mesh objects in the live scene.
  if(initial.meshes.length<38||initial.meshes.some(mesh=>!String(mesh.name).startsWith('V044_')))throw new Error('Unexpected active mesh source');
  await page.locator('[data-motion="Digging"]').click();
  await page.locator('[data-pause]').click();
  const setPose=async value=>page.locator('[data-scrub]').evaluate((input,percent)=>{input.value=String(percent);input.dispatchEvent(new Event('input',{bubbles:true}))},value);
  await setPose(0);const pose0=await page.locator('#kaykit-lab').evaluate(el=>el.kaykitDiagnostics);
  for(const view of ['three-quarter','front','profile']){
    for(const percent of [0,20,45,80,100]){
      await setPose(percent);
      await page.screenshot({path:`${captures}/digging-${String(percent).padStart(3,'0')}-${view}.png`});
    }
    if(view!=='profile')await page.locator('[data-angle]').click();
  }
  await setPose(45);const pose45=await page.locator('#kaykit-lab').evaluate(el=>el.kaykitDiagnostics);
  if(JSON.stringify(pose0.rightHandMatrix)===JSON.stringify(pose45.rightHandMatrix))throw new Error('Digging did not move hand.r');
  if(JSON.stringify(pose0.spadeMatrix)===JSON.stringify(pose45.spadeMatrix))throw new Error('Digging did not move the embedded V0.44 spade');
  await page.screenshot({path:`${out}/komorebi-digging-045.png`});
  await page.locator('[data-character-compare]').click();
  await page.waitForSelector('#character-compare[data-ready="true"]',{timeout:30000});
  await page.screenshot({path:`${out}/comparison-v044-original-vs-rigged.png`});
  await page.screenshot({path:`${captures}/comparison-v044-original-vs-rigged.png`});
  const result={pass:true,url,asset:initial.gardener,mesh_count:initial.meshes.length,bones:initial.bones.length,
    animations:initial.animations,embedded_digging:initial.embeddedDigging,
    observed_motion:{right_hand_matrix_changed:true,spade_matrix_changed:true,phase_from:pose0.phase,phase_to:pose45.phase},javascript_errors:errors};
  if(errors.length)throw new Error(errors.join('; '));
  await writeFile(`${out}/app-verification.json`,JSON.stringify(result,null,2)+'\n');
  console.log('KOMOREBI_V044_APP_OK',JSON.stringify(result));
} finally {
  await browser?.close();
  if(vite?.pid){try{process.kill(-vite.pid,'SIGTERM')}catch{}}
}
