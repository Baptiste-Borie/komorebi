/** Acceptance checks for the diagnostic artifact, not an animation PASS gate. */
import { readFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import sharp from 'sharp';
const out=resolve('reviews/digging-contact-diagnostic');
const report=JSON.parse(await readFile(`${out}/analysis.json`));
const phases=JSON.parse(await readFile(`${out}/phases.json`));
const captures=JSON.parse(await readFile(`${out}/captures.json`));
assert.equal(report.samples,143);assert.equal(report.threshold_H,.005);
assert.equal(report.source_annotations,null);
for(const source of Object.values(report.sources))assert.equal(createHash('sha256').update(await readFile(source.path)).digest('hex'),source.sha256,'Source modified');
const baseline=(await readFile('reviews/digging-measures/ranger/frames.csv','utf8')).trim().split('\n').slice(1).map(s=>+s.split(',')[0]);
for(const config of Object.values(report.configs))assert.deepEqual(config.rows.map(r=>r.time_s),baseline);
assert.equal(phases.reduce((sum,p)=>sum+p.samples,0),143);
assert.deepEqual(phases.flatMap(p=>Array.from({length:p.last_index-p.first_index+1},(_,i)=>p.first_index+i)),Array.from({length:143},(_,i)=>i));
assert.ok(captures.native_blender_alignment_max_H<1e-4);
const files=await readdir(out),images=files.filter(f=>f.endsWith('-annotated.png'));
assert.equal(images.length,17);
for(const file of images){const meta=await sharp(`${out}/${file}`).metadata();assert.equal(meta.width,1440);assert.equal(meta.height,940);}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`file://${out}/index.html`,{waitUntil:'load'});
 await page.locator('#config').selectOption('legacy_zero_pitch');
 await page.locator('#time').evaluate(el=>{el.value='121';el.dispatchEvent(new Event('input'));});
 assert.match(await page.locator('#metrics').textContent(),/1\.200000050/);
 assert.match(await page.locator('#metrics').textContent(),/0\.6816 % H/);
 await page.locator('#config').selectOption('legacy_pitch_175');
 assert.match(await page.locator('#metrics').textContent(),/volume manche D : 0\.0000 % H \/ G : 0\.0000 % H/);
 await page.locator('#time').evaluate(el=>{el.value='23';el.dispatchEvent(new Event('input'));});
 assert.match(await page.locator('#metrics').textContent(),/5\.1439 % H/);
 assert.equal(await page.locator('.gallery figure').count(),17);
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
console.log('PASS: original hashes, exact 143 times, phase partition, pose alignment, 17 valid annotated figures and interactive report controls.');
