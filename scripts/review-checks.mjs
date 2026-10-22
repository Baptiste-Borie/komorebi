import assert from 'node:assert/strict';

/** Exercise public controls and the existing save format. No mutation hooks. */
export async function checkInteractions(page) {
  const checks=[];
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('komorebi-lab-v1')));
  const at=async(x,z,y)=>page.evaluate(([x,z,y])=>window.__komorebiReview.project(x,z,y),[x,z,y]);
  const clickAt=async(x,z,y)=>{const point=await at(x,z,y);await page.mouse.click(point.x,point.y);};
  const reset=async()=>{
    await page.locator('#menu-toggle').click();await page.locator('#reset').click();
    await page.locator('#menu-toggle').click();await page.locator('#home').click();
  };
  await reset();
  const initial=await saved();
  await page.locator('[data-kind="rock"]').click();
  await clickAt(0,2.5);
  const planted=await saved();
  assert.equal(planted.length,initial.length+1,'Click must place a rock');
  const rock=planted.at(-1);
  await page.reload({waitUntil:'networkidle'});
  assert.deepEqual(await saved(),planted,'Reload must preserve every saved field');
  checks.push('Placement et rechargement de la sauvegarde');
  await page.locator('#home').click();
  await page.locator('#erase').click();
  await clickAt(rock.x,rock.z,.30);
  assert.equal((await saved()).length,initial.length,'Picking must delete the placed rock');
  checks.push('Suppression par raycasting');
  await page.locator('#erase').click();

  // A user plant with a high procedural seed used to be silently deleted by
  // the density toggle's seed<100 filter. Preserve it byte-for-byte.
  const custom={id:1501,kind:'fern',x:0,z:3,seed:1501};
  await page.evaluate(p=>{
    const plants=JSON.parse(localStorage.getItem('komorebi-lab-v1'));plants.push(p);
    localStorage.setItem('komorebi-lab-v1',JSON.stringify(plants));
  },custom);
  await page.reload({waitUntil:'networkidle'});
  const beforeDensity=await saved();
  await page.locator('#density').click();
  assert.ok((await saved()).length>beforeDensity.length,'Dense mode must add plants');
  await page.locator('#density').click();
  assert.deepEqual(await saved(),beforeDensity,'Density toggle must preserve custom plants');
  checks.push('Densité réversible, y compris les seeds >= 100');

  await page.locator('#botany-open').click();
  await page.locator('[data-species="birch"]').click();
  await page.locator('[data-variant="3"]').click();
  assert.match(await page.locator('[data-variant="3"]').getAttribute('class'),/active/);
  await page.locator('#botany-plant').click();
  await page.locator('#home').click();await clickAt(0,2);
  const birch=(await saved()).at(-1);
  assert.equal(birch.kind,'tree');assert.equal(birch.seed%4,1,'Workshop must preserve the selected species');
  checks.push('Atelier, variantes et choix de l’espèce à planter');
  await page.locator('#focus').click();
  assert.equal(await page.locator('.build-panel').isVisible(),false);
  await page.locator('#focus').click();
  assert.equal(await page.locator('.build-panel').isVisible(),true);
  checks.push('Mode contemplation');

  // Repeated edits must not accumulate GPU geometries or textures.
  await reset();await page.waitForTimeout(300);
  const before=await page.evaluate(()=>window.__komorebiReview.metrics());
  for(let i=0;i<3;i++){await page.locator('#density').click();await page.locator('#density').click();}
  await page.waitForTimeout(300);
  const after=await page.evaluate(()=>window.__komorebiReview.metrics());
  assert.ok(after.geometries<=before.geometries+2,`Geometry leak: ${before.geometries} -> ${after.geometries}`);
  assert.ok(after.textures<=before.textures+1,'Textures must be reused');
  checks.push('Stabilité des ressources GPU après six reconstructions');
  await reset();
  await page.locator('[data-kind="pond"]').click();
  await clickAt(-1.25,2.5);
  assert.equal((await saved()).at(-1).kind,'pond','A second pond must be placeable on the path');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#scene canvas').isVisible(),true);
  checks.push('Ajout d’une mare hors de sa position initiale');

  const reviewUrl=page.url();
  await page.goto(reviewUrl.replace('&time=4',''),{waitUntil:'networkidle'});
  const t0=await page.evaluate(()=>window.__komorebiReview.metrics().waterTime);
  await page.waitForTimeout(200);
  const t1=await page.evaluate(()=>window.__komorebiReview.metrics().waterTime);
  assert.ok(t1>t0,'Water time must advance outside fixed review captures');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>window.__komorebiReview.metrics().waterTime),0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  checks.push('Animation de l’eau et respect du mouvement réduit');
  await page.goto(reviewUrl,{waitUntil:'networkidle'});await reset();
  return checks;
}
