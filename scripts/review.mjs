import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const folder=resolve('review-temp');
const out=resolve('komorebi-review.zip');
await mkdir(folder,{recursive:true});
const server=spawn('npm',['run','dev','--','--port','4178','--strictPort'],{stdio:'ignore',detached:process.platform!=='win32'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  let ready=false;for(let i=0;i<40;i++){try{const r=await fetch('http://127.0.0.1:4178');if(r.ok){ready=true;break}}catch{}await sleep(350)}
  if(!ready)throw new Error('Vite ne démarre pas sur le port 4178');
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4178',{waitUntil:'networkidle'});
  const styles=['lowpoly','organic','vector'];
  for(const s of styles){await page.locator(`[data-style="${s}"]`).click();await page.waitForTimeout(450);await page.screenshot({path:resolve(folder,`${s}.png`),fullPage:true});await page.locator('#density').click();await page.waitForTimeout(200);await page.screenshot({path:resolve(folder,`${s}-dense.png`),fullPage:true});await page.locator('#density').click();}
  if(errors.length)throw new Error(`Erreurs navigateur: ${errors.join('; ')}`);
  const files=(await readdir(folder)).filter(x=>x.endsWith('.png'));
  try{execFileSync('zip',['-j','-q',out,...files.map(f=>resolve(folder,f))]);}catch{throw new Error('Commande zip manquante (sudo apt install zip)');}
  console.log(`Revue créée : ${out} (${files.length} captures)`);
}finally{await browser?.close();if(process.platform==='win32')server.kill();else {try{process.kill(-server.pid!,'SIGTERM')}catch{server.kill()}}await rm(folder,{recursive:true,force:true});}
