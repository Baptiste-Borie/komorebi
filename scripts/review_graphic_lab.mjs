#!/usr/bin/env node
/** Revue visuelle dédiée au Graphic Lab. N'utilise pas les anciens tests du jardin. */
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';

const root=resolve(import.meta.dirname,'..');
const folder=join(root,'reviews','graphic-lab-001');
const zip=join(root,'reviews','komorebi-graphic-lab-001.zip');
const port=4179;
const url=`http://127.0.0.1:${port}`;
const ids=['paper','ascii','stipple','riso','etching','cyanotype'];
await mkdir(folder,{recursive:true});
const server=spawn('npm',['run','dev','--','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:'ignore',detached:true});
let browser;
let failed=false;
try {
 let ready=false;
 for(let i=0;i<40;i++){
  try{const r=await fetch(url);if(r.ok){ready=true;break;}}catch{}
  await delay(250);
 }
 if(!ready)throw new Error('Serveur Vite indisponible sur '+url);
 browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'networkidle'});
 await page.locator('#preview-a').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('#preview-a')?.width>200);
 await page.locator('#animation').uncheck();
 await page.locator('[data-preset="grove"]').click();
 const results=[];
 for(const id of ids){
  await page.locator(`[data-style="${id}"]`).click();
  await page.waitForTimeout(250);
  const canvas=page.locator('#preview-a');
  const png=await canvas.screenshot({type:'png'});
  const out=`${id}.webp`;
  await sharp(png).webp({quality:88}).toFile(join(folder,out));
  const dim=await page.evaluate(()=>{const c=document.querySelector('#preview-a');return {width:c.width,height:c.height};});
  results.push({style:id,image:out,...dim});
 }
 await page.locator('.toggle-label').click();
 await page.locator('#against').selectOption('ascii');
 await page.locator('[data-preset="abundant"]').click();
 await page.waitForTimeout(400);
 const png=await page.locator('.preview-panel').screenshot({type:'png'});
 await sharp(png).webp({quality:85}).toFile(join(folder,'comparison-dense.webp'));
 if(errors.length)throw new Error('Erreurs JS : '+errors.join(' | '));
 await writeFile(join(folder,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),results,jsErrors:errors,scalability:{biodiversity:14,abundance:104}},null,2));
 // Archive optionnelle, sans screenshots PNG persistants.
 const check=spawnSync('zip',['-v'],{stdio:'ignore'});
 if(check.status===0){
  await rm(zip,{force:true});
  const pack=spawnSync('zip',['-q','-j',zip,...ids.map(id=>join(folder,`${id}.webp`)),join(folder,'comparison-dense.webp'),join(folder,'manifest.json')],{stdio:'inherit'});
  if(pack.status!==0)throw new Error('Impossible de produire le ZIP de revue');
 }
 console.log(`Revue graphique OK : ${folder}`);
 if(check.status===0)console.log(`Archive : ${zip}`);
} catch(e){failed=true;console.error('Graphic Lab review failed:',e);}
finally{
 if(browser)await browser.close();
 if(server.pid){try{process.kill(-server.pid,'SIGTERM');}catch{try{server.kill('SIGTERM');}catch{}}}
}
if(failed)process.exitCode=1;
