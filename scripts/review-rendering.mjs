import assert from 'node:assert/strict';
import sharp from 'sharp';

/** Compare the production paths at a fixed water time, not mocked GLSL. */
export async function checkRendering(page) {
  const canvas=page.locator('#scene canvas');
  const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const shot=async()=>sharp(await canvas.screenshot()).removeAlpha().raw().toBuffer();
  const meanDifference=(a,b)=>{let sum=0;assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);return sum/a.length;};
  const original=await shot();
  const supported=await page.evaluate(()=>window.__komorebiReview.metrics().contours);
  await page.evaluate(()=>window.__komorebiReview.study(false,false));await settle();
  const plain=await shot();
  assert.ok(meanDifference(original,plain)>.05,'Surface detail must change rendered pixels');
  await page.evaluate(()=>window.__komorebiReview.study(true,true));await settle();
  const contoured=await shot();
  const withContours=await page.evaluate(()=>window.__komorebiReview.metrics());
  await page.evaluate(()=>window.__komorebiReview.study(true,false));await settle();
  const direct=await shot();
  const without=await page.evaluate(()=>window.__komorebiReview.metrics());
  if(supported){
    assert.equal(withContours.calls,without.calls+1,'Contour resolve must add exactly one draw call');
    const delta=meanDifference(contoured,direct);
    assert.ok(delta>.001&&delta<8,`Contour resolve must stay subtle, measured difference ${delta}`);
  }
  await page.evaluate(()=>window.__komorebiReview.study(true,false));await settle();
  const size=page.viewportSize();
  await page.setViewportSize({width:1000,height:720});await settle();await shot();
  await page.setViewportSize(size);await settle();await shot();
  const resized=await page.evaluate(()=>window.__komorebiReview.metrics());
  assert.equal(resized.textures,withContours.textures,'Resizing must not accumulate render textures');
  assert.equal(resized.geometries,withContours.geometries,'Resizing must not accumulate geometries');
  return ['Surfaces actives, rendu direct et contour limité à une passe','Redimensionnement et stabilité des cibles de rendu'];
}
