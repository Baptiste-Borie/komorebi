// V0.51 — inspect KayKit gardener + hand-attached shovel, auto-start Vite.
// Does not modify or restart a server already running at the chosen URL.
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile, rmdir } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const url = process.env.KOMOREBI_URL ?? 'http://127.0.0.1:5173/?kaykit=1';
const reviewDir = resolve('reviews/character-lab/v051');
await mkdir(reviewDir, { recursive: true });

const ping = async () => {
  try { const response = await fetch(url, { signal: AbortSignal.timeout(1500) }); return response.ok; }
  catch { return false; }
};
const sleep = ms => new Promise(done => setTimeout(done, ms));
let vite;
let browser;
let loggedFailure = false;
try {
  if (!await ping()) {
    // Only auto-start the default local server; a custom URL may be remote.
    if (process.env.KOMOREBI_URL) {
      throw new Error(`Serveur absent à ${url}. Démarre ce serveur avant la revue.`);
    }
    vite = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173', '--strictPort'],
      { cwd: resolve('.'), stdio: 'ignore', detached: process.platform !== 'win32' });
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (await ping()) { ready = true; break; }
      if (vite.exitCode !== null) break;
      await sleep(250);
    }
    if (!ready) throw new Error('Impossible de démarrer Vite sur 127.0.0.1:5173. Vérifie que `npm ci` a été lancé.');
    console.log('Serveur Vite démarré automatiquement pour la revue.');
  }

  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1360, height: 880 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#kaykit-lab[data-ready="true"]', { timeout: 30000 });
  // Capture paused deterministic poses, not arbitrary frame timings.
  await page.locator('[data-pause]').click();
  const setPose = async value => page.locator('[data-scrub]').evaluate((input, percentage) => {
    input.value = String(percentage);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  for (const animation of ['Idle_A', 'Walking_A', 'Dig', 'Digging']) {
    const button = page.locator(`[data-motion="${animation}"]`);
    if (await button.count() !== 1) throw new Error(`Animation absente : ${animation}`);
    await button.click();
    await setPose(45);
    await page.screenshot({ path: `${reviewDir}/${animation}_45.png` });
    if (animation === 'Digging') {
      for (const pose of [20, 80]) {
        await setPose(pose);
        await page.screenshot({ path: `${reviewDir}/Digging_${pose}.png` });
      }
    }
  }
  // Check that the shovel really exists on the right-hand bone before capturing.
  const spadeBone = await page.locator('#kaykit-lab').evaluate(el => el.kaykitDiagnostics?.spadeBone);
  if (spadeBone !== 'handslot.r') throw new Error('Pelle non attachée à handslot.r.');
  // Review the hand grip in a close front view and at multiple digging phases.
  await page.locator('[data-motion="Digging"]').click();
  await page.locator('[data-angle]').click(); // 3/4 -> face
  for (const pose of [20, 45, 80]) {
    await setPose(pose);
    await page.screenshot({ path: `${reviewDir}/Pelle_face_${pose}.png` });
  }
  await page.locator('[data-angle]').click(); // face -> profile
  await setPose(45);
  await page.screenshot({ path: `${reviewDir}/Pelle_profil_45.png` });
  await page.locator('[data-angle]').click(); // profile -> 3/4
  // Compare the exact same animated poses with the source KayKit Ranger.
  await page.locator('#kaykit-lab button[data-variant]').click();
  for (const motion of ['Walking_A', 'Digging']) {
    await page.locator(`[data-motion="${motion}"]`).click();
    await setPose(45);
    await page.screenshot({ path: `${reviewDir}/Ranger_original_${motion}_45.png` });
  }
  // Return to the skinned gardener for silhouette shots.
  await page.locator('#kaykit-lab button[data-variant]').click();
  // Three directions, matching original V0.45 framing.
  await page.locator('[data-motion="Idle_A"]').click();
  await setPose(10);
  await page.screenshot({ path: `${reviewDir}/Jardinier_trois_quarts.png` });
  await page.locator('[data-angle]').click();
  await page.screenshot({ path: `${reviewDir}/Jardinier_face.png` });
  await page.locator('[data-angle]').click();
  await page.screenshot({ path: `${reviewDir}/Jardinier_profil.png` });

  // Never accept the old Ranger in place of the requested hybrid.
  const diagnostics = await page.locator('#kaykit-lab').evaluate(element => element.kaykitDiagnostics ?? null);
  if (diagnostics?.gardener !== 'gardener-v051.glb' ||
      diagnostics.meshes.filter(mesh => String(mesh.name).startsWith('Hybrid_v051_')).length < 20) {
    throw new Error('Le vrai GLB hybride V0.51 n’est pas affiché : revue et push annulés.');
  }
  // Front/side plus side-by-side old V0.44 vs hybrid V0.51 under same lighting.
  await page.locator('[data-character-compare]').click();
  await page.waitForSelector('#character-compare[data-ready="true"]', { timeout: 30000 });
  await page.screenshot({ path: `${reviewDir}/Comparatif_V044_hybride_V051.png` });
  await page.locator('#character-compare [data-close]').click();
  if (!diagnostics) throw new Error('Rapport des maillages introuvable. Recharge le patch V0.45b.');
  const reportPath = `${reviewDir}/KayKit-diagnostic.json`;
  await writeFile(reportPath, JSON.stringify(diagnostics, null, 2) + '\n');
  if (errors.length) throw new Error(`Erreurs JavaScript : ${errors.join('; ')}`);

  // The real, locally imported CC0 GLB is needed for precise Blender work.
  // Include it in the review ZIP (no full KayKit archive, no third-party scraping).
  const manifest = JSON.parse(await readFile(resolve('public/assets/kaykit-v045/manifest.json'), 'utf8'));
  const sourceGlb = resolve('public', String(manifest.model).replace(/^\//, ''));
  if (!sourceGlb.startsWith(resolve('public/assets/kaykit-v045') + '/'))
    throw new Error('Chemin de modèle KayKit non valide dans le manifeste.');
  const archive = resolve('reviews/komorebi-v051-review.zip');
  execFileSync('python3', ['-c', `import zipfile,sys
from pathlib import Path
folder=Path(sys.argv[1]); output=Path(sys.argv[2]); files=sorted([*folder.glob('*.png'),*folder.glob('*.json')])
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
 for file in files:archive.write(file,file.name)
source=Path(sys.argv[3]); modified=Path(sys.argv[4]); old=Path(sys.argv[5]); previous=Path(sys.argv[6]);
with zipfile.ZipFile(output,'a',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
 if source.is_file() and source.suffix.lower()=='.glb': archive.write(source,'source/Ranger.glb')
 if not modified.is_file(): raise RuntimeError('GLB jardinier non généré. Lance python3 scripts/build_gardener_v046.py')
 archive.write(modified,'source/gardener-v051.glb')
 if not old.is_file() or not previous.is_file(): raise RuntimeError('Sources du modèle hybride manquantes')
 archive.write(old,'source/gardener-v044.glb')
 archive.write(previous,'source/gardener-v047.glb')
with zipfile.ZipFile(output) as archive:
 assert archive.testzip() is None and len(archive.namelist())>=10
for file in files:file.unlink()
`, reviewDir, archive, sourceGlb, resolve('public/assets/kaykit-v045/gardener-v051.glb'), resolve('public/assets/gardener-v044.glb'), resolve('public/assets/kaykit-v045/gardener-v047.glb')], { stdio: 'inherit' });
  await rmdir(reviewDir).catch(error => { if (error.code !== 'ENOTEMPTY') throw error; });
  console.log('Revue, diagnostic et fichier Ranger GLB (si disponible) :', archive);
  console.log('Hybride V0.51 et pelle + V0.44/V0.47 : poses comparatives et GLB embarqués.');
  // A completed visual review also builds, commits and pushes. No second command.
  const { autoCommitAndPush } = await import('./auto_push.mjs');
  await autoCommitAndPush({ label: 'review-gardener' });
} catch (error) {
  loggedFailure = true;
  console.error('Revue KayKit :', error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (vite?.pid) {
    try {
      if (process.platform === 'win32') vite.kill('SIGTERM');
      else process.kill(-vite.pid, 'SIGTERM');
    } catch { /* server already exited */ }
  }
  if (loggedFailure) {
    console.error('La revue ou la publication a échoué : regarde le message ci-dessus.');
  }
}
