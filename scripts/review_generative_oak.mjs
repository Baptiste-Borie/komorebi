#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const folder = join(root, 'reviews', 'generative-art-001');
const archive = join(root, 'reviews', 'komorebi-generative-art-001-captures.zip');
const port = 4181;
const baseUrl = `http://127.0.0.1:${port}`;
const views = [
  { id: 'normal', query: '' },
  { id: 'close', query: '?view=close' },
  { id: 'far', query: '?view=far' },
];

await mkdir(folder, { recursive: true });
const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore', detached: true });
let browser;
let failed = false;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(baseUrl)).ok) { ready = true; break; } } catch {}
    await delay(250);
  }
  if (!ready) throw new Error(`Serveur Vite indisponible sur ${baseUrl}`);
  browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  const results = [];
  for (const view of views) {
    await page.goto(baseUrl + view.query, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.KOMOREBI_OAK));
    await page.waitForTimeout(350);
    const png = await page.screenshot({ type: 'png' });
    const filename = `oak-${view.id}-1920x1080.webp`;
    await sharp(png).webp({ quality: 92, effort: 5 }).toFile(join(folder, filename));
    const metrics = await page.evaluate(() => {
      const oak = window.KOMOREBI_OAK;
      return {
        viewport: [innerWidth, innerHeight],
        marks: oak.cache.stats.marks,
        branches: oak.cache.stats.branches,
        canopyMasses: oak.cache.stats.canopyMasses,
        generationMs: oak.cache.stats.renderMs,
      };
    });
    results.push({ view: view.id, file: filename, ...metrics });
  }
  if (errors.length || consoleErrors.length) throw new Error(`Erreurs navigateur : ${[...errors, ...consoleErrors].join(' | ')}`);
  const manifest = { createdAt: new Date().toISOString(), results, pageErrors: errors, consoleErrors };
  await writeFile(join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await rm(archive, { force: true });
  const zip = spawnSync('zip', ['-q', '-j', archive, ...results.map((result) => join(folder, result.file)), join(folder, 'manifest.json')], { stdio: 'inherit' });
  if (zip.status !== 0) throw new Error('Impossible de créer le ZIP des captures');
  console.log(`Captures : ${folder}`);
  console.log(`Archive : ${archive}`);
} catch (error) {
  failed = true;
  console.error('Generative oak review failed:', error);
} finally {
  if (browser) await browser.close();
  if (server.pid) {
    try { process.kill(-server.pid, 'SIGTERM'); } catch { try { server.kill('SIGTERM'); } catch {} }
  }
}
if (failed) process.exitCode = 1;
