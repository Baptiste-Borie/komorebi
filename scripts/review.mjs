import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const reviewsDir = resolve('reviews');
const tempDir = resolve('review-temp');
await mkdir(reviewsDir, { recursive: true });
await rm(tempDir, { recursive: true, force: true });
await mkdir(tempDir, { recursive: true });
const existing = await readdir(reviewsDir);
const numbers = existing.map(name => /^komorebi-review-(\d+)\.zip$/.exec(name)?.[1])
  .filter(Boolean).map(Number);
const sequence = String(Math.max(0, ...numbers) + 1).padStart(3, '0');
const archive = resolve(reviewsDir, `komorebi-review-${sequence}.zip`);
const port = 4178;
const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  stdio: 'ignore', detached: process.platform !== 'win32',
});
const sleep = ms => new Promise(done => setTimeout(done, ms));
let browser;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null) break;
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) { ready = true; break; } } catch { /* still starting */ }
    await sleep(250);
  }
  if (!ready) throw new Error(`Vite n'a pas démarré sur le port ${port} (port déjà occupé ?)`);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' });
  await page.locator('canvas').waitFor({ state: 'visible' });
  await page.locator('#reset').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(tempDir, '01-lowpoly.png'), fullPage: true });
  await page.locator('#density').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(tempDir, '02-lowpoly-dense.png'), fullPage: true });
  await page.locator('#reset').click();
  if (errors.length) throw new Error(`Erreurs dans le navigateur : ${errors.join(' ; ')}`);
  const screenshots = (await readdir(tempDir)).filter(file => file.endsWith('.png')).sort();
  execFileSync('zip', ['-q', '-j', archive, ...screenshots.map(file => resolve(tempDir, file))]);
  console.log(`Revue créée : reviews/komorebi-review-${sequence}.zip (${screenshots.length} captures)`);
} finally {
  await browser?.close();
  if (process.platform === 'win32') server.kill();
  else { try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill(); } }
  await rm(tempDir, { recursive: true, force: true });
}
