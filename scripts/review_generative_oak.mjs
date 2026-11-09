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
  const previous = spawnSync('git', ['show', 'HEAD:reviews/generative-art-001/oak-normal-1920x1080.webp'], { cwd: root });
  if (previous.status !== 0 || !previous.stdout.length) throw new Error('Capture précédente introuvable dans HEAD');
  const currentPath = join(folder, 'oak-normal-1920x1080.webp');
  const previousPanel = await sharp(previous.stdout).resize(960, 540, { fit: 'cover' }).toBuffer();
  const currentPanel = await sharp(currentPath).resize(960, 540, { fit: 'cover' }).toBuffer();
  const labels = Buffer.from(`<svg width="1920" height="540" xmlns="http://www.w3.org/2000/svg">
    <style>.label{font:700 14px Arial,sans-serif;letter-spacing:3px;fill:#f4eddd}.back{fill:#203729;fill-opacity:.82}</style>
    <rect class="back" x="24" y="22" width="154" height="38" rx="19"/><text class="label" x="45" y="47">AVANT</text>
    <rect class="back" x="984" y="22" width="154" height="38" rx="19"/><text class="label" x="1005" y="47">APRÈS</text>
  </svg>`);
  const comparisonFile = 'oak-comparison-previous-current.webp';
  await sharp({ create: { width: 1920, height: 540, channels: 3, background: '#e7dfcc' } })
    .composite([{ input: previousPanel, left: 0, top: 0 }, { input: currentPanel, left: 960, top: 0 }, { input: labels, left: 0, top: 0 }])
    .webp({ quality: 92, effort: 5 })
    .toFile(join(folder, comparisonFile));
  const manifest = { createdAt: new Date().toISOString(), results, comparison: comparisonFile, pageErrors: errors, consoleErrors };
  await writeFile(join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await rm(archive, { force: true });
  const zip = spawnSync('zip', ['-q', '-j', archive, ...results.map((result) => join(folder, result.file)), join(folder, comparisonFile), join(folder, 'manifest.json')], { stdio: 'inherit' });
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
