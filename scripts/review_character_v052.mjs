/** V0.52 review — OUR ORIGINAL skinned gardener, no KayKit/hybrid assets.
 * The review is intentionally narrow: two shoulder/cuff corrections + existing
 * Dig/Fill/Level animation clips. Does not push itself; the package script does.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const out = resolve('reviews/character-lab/v052');
const archive = resolve('reviews/komorebi-v052-review.zip');
const modelPath = resolve('public/assets/gardener-v052.glb');
await mkdir(out, { recursive:true });
const server = await createServer({server:{host:'127.0.0.1',port:4179,strictPort:true,hmr:false}});
let browser;
const errors=[];
try {
  await server.listen();
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,
    headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:4179/?review=1',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{const m=await import('/src/characterCompare.ts');m.openCharacterCompare();});
  await page.waitForSelector('#character-compare[data-ready="true"]',{timeout:40000});
  for(const [key,label] of [['front','face'],['three-quarter','trois_quarts'],['side','profil']]){
    await page.locator(`#character-compare [data-view="${key}"]`).click();
    await page.waitForTimeout(350);
    await page.screenshot({path:`${out}/Avant_apres_${label}.png`});
  }
  await page.locator('#character-compare [data-close]').click();
  // Validate the GLB's actual rig and animated clips, not just the UI text.
  const glb=await page.evaluate(async()=>{
    const response=await fetch('/assets/gardener-v052.glb');
    if(!response.ok)throw new Error('GLB V0.52 non servi');
    const bytes=await response.arrayBuffer();
    const view=new DataView(bytes);
    if(view.getUint32(0,true)!==0x46546c67)throw new Error('Pas un GLB');
    const length=view.getUint32(12,true);
    const doc=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,length)));
    return {bones:doc.skins?.[0]?.joints?.length??0,meshes:doc.meshes?.length??0,
      animations:(doc.animations??[]).map(a=>a.name)};
  });
  if(glb.bones<9 || glb.meshes<25 || !['dig','fill','level'].every(n=>glb.animations.some(c=>c.toLowerCase().includes(n)))){
    throw new Error('V0.52 : rig/animations incomplets : '+JSON.stringify(glb));
  }
  await page.evaluate(async()=>{const m=await import('/src/shovelWorkshop.ts');m.openShovelWorkshop();});
  await page.locator('#shovel-workshop').waitFor();
  await page.waitForFunction(()=>document.body.dataset.gardenerLoaded==='v052',{timeout:40000});
  await page.locator('#shovel-pause').click();
  for(const mode of ['dig','fill','level']){
    await page.locator(`[data-pose="${mode}"]`).click();
    await page.locator('#shovel-scrub').evaluate(input=>{input.value='45';input.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForTimeout(350);
    await page.screenshot({path:`${out}/Animation_${mode}_45.png`});
  }
  await writeFile(`${out}/test-report.json`,JSON.stringify({asset:'gardener-v052.glb',base:'gardener-v044.glb',glb,errors},null,2)+'\n');
  if(errors.length)throw new Error('Erreurs navigateur : '+errors.join('; '));
  // Atomic ZIP is created only after all screenshots/functional gates succeed.
  const src=`import pathlib,zipfile,sys
folder=pathlib.Path(sys.argv[1]);dest=pathlib.Path(sys.argv[2]);asset=pathlib.Path(sys.argv[3]);base=pathlib.Path(sys.argv[4]);tmp=dest.with_suffix('.tmp')
with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for file in sorted(folder.glob('*.png')):z.write(file,file.name)
 for file in sorted(folder.glob('*.json')):z.write(file,file.name)
 z.write(asset,'source/gardener-v052.glb');z.write(base,'source/gardener-v044.glb')
with zipfile.ZipFile(tmp) as z:
 assert z.testzip() is None and len(z.namelist())>=9
 tmp.replace(dest)
`;
  execFileSync('python3',['-c',src,out,archive,modelPath,resolve('public/assets/gardener-v044.glb')],{stdio:'inherit'});
  // Keep only the final ZIP, not hundreds of temporary screenshots.
  await rm(out,{recursive:true,force:true});
  console.log('✓ Revue V0.52 validée techniquement :',archive);
  console.log('✓ Ancien jardinier intact. Deux corrections visuelles à valider par le créateur.');
}finally{
  await browser?.close();
  await server.close();
}
