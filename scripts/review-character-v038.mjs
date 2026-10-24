import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
const out='reviews/character-lab/v038';
await mkdir(out,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:4179,strictPort:true,hmr:false}});
await server.listen();
let browser;
try {
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-features=LocalNetworkAccessChecks,LocalNetworkAccessChecksWebSockets']});
 const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 // Isolate the actual Lab module from the unrelated Earthworks scene.
 await page.route('http://127.0.0.1:4179/',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
 await page.goto('http://127.0.0.1:4179');
 await page.evaluate(async()=>{await import('/src/style.css');const lab=await import('/src/characterLab.ts');window.openReviewLab=lab.openCharacterLab;lab.openCharacterLab();});
 await page.locator('#character-lab-status').filter({hasText:'GLB chargé'}).waitFor();
 for(const view of ['front','side','three-quarter']) {
  await page.locator(`[data-view="${view}"]`).click();await page.waitForTimeout(500);
  await page.screenshot({path:`${out}/lab-${view}.png`});
 }
 await page.locator('.character-lab-stage').hover();
 for(let i=0;i<7;i++){await page.mouse.wheel(0,120);await page.waitForTimeout(80);}
 await page.waitForTimeout(500);await page.screenshot({path:`${out}/lab-distance.png`});
 await page.locator('#character-lab-close').click();await page.evaluate(()=>window.openReviewLab());
 await page.locator('#character-lab-status').filter({hasText:'GLB chargé'}).waitFor();
 await writeFile(`${out}/browser-report.json`,JSON.stringify({errors,views:['front','side','three-quarter','distance'],reopened:true},null,2)+'\n');
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('Character V0.38: loaded, four screenshots, reopened, no console errors.');
} finally {await browser?.close();await server.close();}
