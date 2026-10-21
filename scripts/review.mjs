import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, rm, readdir, writeFile, readFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

// PNG -> Base64 plain-text chunks. Each chunk is kept small to make connector reads robust.
// Exact reconstruction is checked using the SHA-256 of the ORIGINAL PNG bytes.
const output = resolve('reviews');
const staging = resolve('review-staging');
const chunkChars = 24000; // divisible by 4, so concatenation recreates original Base64
const port = 4178;
const url = `http://127.0.0.1:${port}`;
await rm(staging, {recursive:true, force:true});
await mkdir(staging, {recursive:true});
const server = spawn('npm', ['run','dev','--','--host','127.0.0.1','--port',String(port),'--strictPort'], {
  stdio:'ignore', detached: process.platform !== 'win32',
});
const sleep = ms => new Promise(done => setTimeout(done,ms));
let browser;
let finished = false;
try {
  let ready=false;
  for(let i=0;i<80;i++) {
    if(server.exitCode !== null) break;
    try {if((await fetch(url)).ok){ready=true;break;}}catch{}
    await sleep(250);
  }
  if(!ready) throw Error('Vite indisponible sur le port 4178');
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'networkidle'});
  const canvas=page.locator('#scene canvas');
  await canvas.waitFor({state:'visible'});
  await page.locator('#reset').click();
  await page.waitForTimeout(600);
  const manifest={version:1,format:'lossless PNG encoded as base64 chunks',chunkChars,images:[]};
  async function capture(name) {
    // Capture the actual rendered garden area, not the surrounding UI.
    const box=await page.locator('#viewport').boundingBox();
    if(!box || box.width<500 || box.height<350) throw Error('Viewport trop petit');
    const filename=`${name}.png`;
    const bytes=await page.locator('#viewport').screenshot({type:'png',animations:'disabled'});
    const hash=createHash('sha256').update(bytes).digest('hex');
    const encoded=bytes.toString('base64');
    const count=Math.ceil(encoded.length/chunkChars);
    const parts=[];
    for(let i=0;i<count;i++){
      const part=`${name}.part-${String(i+1).padStart(3,'0')}.b64`;
      await writeFile(join(staging,part),encoded.slice(i*chunkChars,(i+1)*chunkChars),'ascii');
      parts.push(part);
    }
    await writeFile(join(staging,filename),bytes);
    manifest.images.push({file:filename,sha256:hash,bytes:bytes.length,parts});
    console.log(`${filename}: ${bytes.length} octets, ${count} fragments, SHA256 ${hash.slice(0,12)}…`);
  }
  async function orbit(fromX,fromY,dx,dy){
    const box=await canvas.boundingBox();
    if(!box)throw Error('Canvas inaccessible');
    const x=box.x+box.width*fromX,y=box.y+box.height*fromY;
    await page.mouse.move(x,y);
    await page.mouse.down();
    await page.mouse.move(x+dx,y+dy,{steps:12});
    await page.mouse.up();
    await page.waitForTimeout(400);
  }
  await capture('01-default');
  await orbit(.5,.5,230,-45);
  await capture('02-left-angle');
  await orbit(.5,.5,-430,30);
  await capture('03-right-angle');
  await page.locator('#home').click();
  await orbit(.5,.5,0,115);
  await capture('04-high-angle');
  await page.locator('#home').click();
  await page.locator('#density').click();
  await page.waitForTimeout(850);
  await capture('05-dense');
  if(errors.length)throw Error(`Erreurs navigateur: ${errors.join(' ; ')}`);
  await writeFile(join(staging,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  // Only replace the previous review once all 5 captures have succeeded.
  await rm(output,{recursive:true,force:true});
  await rename(staging,output);
  finished=true;
  console.log('✓ 5 PNG + fichiers Base64 fragmentés + manifest SHA256 dans reviews/');
} finally {
  await browser?.close();
  if(process.platform==='win32')server.kill();
  else {try{process.kill(-server.pid,'SIGTERM');}catch{server.kill();}}
  if(!finished)await rm(staging,{recursive:true,force:true});
}
