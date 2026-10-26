// Automated smoke review of our navigation and character tools (no Git operations).
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const port = 5189;
const host = `http://127.0.0.1:${port}`;
const staging = resolve('review-staging/v050-navigation');
const zip = resolve('reviews/komorebi-v050-ui-review.zip');
await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
let server, browser;
const delay = ms => new Promise(done => setTimeout(done, ms));
try {
  server = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run','dev','--','--host','127.0.0.1','--port',String(port),'--strictPort'],
    { stdio:'ignore', detached: process.platform !== 'win32' });
  let up = false;
  for(let i=0;i<80;i++){
    if(server.exitCode !== null) break;
    try { if((await fetch(host, {signal:AbortSignal.timeout(750)})).ok){up=true;break;} }catch{}
    await delay(250);
  }
  if(!up) throw new Error('Serveur UI de revue inaccessible (port 5189).');
  browser = await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const exceptions=[];
  page.on('pageerror',e=>exceptions.push(e.message));
  await page.goto(host, {waitUntil:'domcontentloaded'});
  await page.locator('#workspace-home').waitFor({state:'visible'});
  await page.getByRole('heading',{name:'Donner vie à notre jardin.'}).waitFor();
  await page.screenshot({path:`${staging}/01-accueil.png`});
  await page.locator('#workspace-home [data-workspace="compare"]').click();
  await page.locator('#character-compare[data-ready="true"]').waitFor({timeout:30000});
  await page.locator('#character-compare [data-group-tab="body"]').click();
  await page.locator('#character-compare .cc-region[data-group="body"]:visible').first().waitFor();
  await page.screenshot({path:`${staging}/02-comparaison-corps.png`});
  await page.locator('#character-compare [data-close]').click();
  await page.locator('#workspace-home').waitFor({state:'visible'});
  await page.locator('#workspace-home [data-workspace="animations"]').click();
  await page.locator('#kaykit-lab[data-ready="true"]').waitFor({timeout:30000});
  await page.screenshot({path:`${staging}/03-animations.png`});
  await page.locator('#kaykit-lab [data-close]').click();
  await page.locator('#workspace-home').waitFor({state:'visible'});
  await page.locator('#workspace-home [data-workspace="garden"]').first().click();
  await page.locator('#workspace-home').waitFor({state:'hidden'});
  if(exceptions.length) throw new Error('Erreurs JS : '+exceptions.join('; '));
  execFileSync('python3', ['-c', `import zipfile,sys
from pathlib import Path
p=Path(sys.argv[1]);z=Path(sys.argv[2]);z.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as out:
 for f in sorted(p.glob('*.png')):out.write(f,f.name)
with zipfile.ZipFile(z) as check:
 assert check.testzip() is None and len(check.namelist())==3
`, staging, zip], {stdio:'inherit'});
  console.log('✓ Navigation, comparaison, animations et retour au jardin : OK.');
  console.log('✓ Captures UI :',zip);
} finally {
  await browser?.close();
  if(server?.pid) {
    try {process.platform==='win32'? server.kill('SIGTERM') : process.kill(-server.pid,'SIGTERM');}
    catch { /* process already stopped */ }
  }
  await rm(staging, {recursive:true,force:true});
}
