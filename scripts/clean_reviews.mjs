#!/usr/bin/env node
/**
 * Komorebi — safely remove disposable review intermediates.
 *
 * Default: preview only. `--apply` deletes recognized temporary files for
 * character reviews that already have a final ZIP. Never touches .blend, .glb,
 * the main garden manifest/WebP set or unrelated folders.
 *
 * `--archives --keep=3` (opt-in) additionally keeps the three most recent
 * versioned Komorebi ZIPs, grouped by archive prefix.
 */
import { lstat, readdir, rm, rmdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const usage = 'Usage: npm run review:clean [-- --apply] [--archives --keep=3]';
if (args.includes('--help') || args.includes('-h')) {
  console.log(usage);
  process.exit(0);
}
const unknown = args.filter(arg => !['--apply', '--archives', '--dry-run'].includes(arg) && !/^--keep=\d+$/.test(arg));
if (unknown.length) {
  console.error(`Option inconnue : ${unknown.join(' ')}\n${usage}`);
  process.exit(2);
}
const apply = args.includes('--apply') && !args.includes('--dry-run');
const archives = args.includes('--archives');
const keep = Number(args.find(arg => arg.startsWith('--keep='))?.slice(7) ?? 3);
if (!Number.isSafeInteger(keep) || keep < 1 || (args.some(arg => arg.startsWith('--keep=')) && !archives)) {
  console.error('`--keep=N` nécessite `--archives`, avec N >= 1.');
  process.exit(2);
}
const root = resolve('reviews');
const rootStat = await lstat(root).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
if (!rootStat) {
  console.log('Pas de dossier reviews/ : rien à nettoyer.');
  process.exit(0);
}
if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
  console.error('Sécurité : reviews/ doit être un dossier réel, pas un lien symbolique.');
  process.exit(2);
}

const files = await readdir(root, { withFileTypes: true });
const finalZip = new Map();
for (const entry of files) {
  if (!entry.isFile() || !entry.name.endsWith('-review.zip')) continue;
  const match = /^(.+)-v(\d+)([a-z]?)-review\.zip$/.exec(entry.name);
  if (!match) continue;
  const path = join(root, entry.name);
  const info = await stat(path);
  if (info.size < 1024) continue; // refuse suspiciously empty archives
  const version = `v${match[2]}`;
  if (!finalZip.has(version)) finalZip.set(version, []);
  finalZip.get(version).push(entry.name);
}

const planned = [];
const lab = join(root, 'character-lab');
const labStat = await lstat(lab).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
if (labStat?.isDirectory() && !labStat.isSymbolicLink()) {
  for (const version of await readdir(lab, { withFileTypes: true })) {
    if (!version.isDirectory() || !/^v\d{2,4}[a-z]?$/.test(version.name)) continue;
    const versionKey = /^v\d+/.exec(version.name)?.[0];
    if (!finalZip.has(versionKey)) continue; // no review archive, don't touch
    const folder = join(lab, version.name);
    const contents = await readdir(folder, { withFileTypes: true });
    for (const item of contents) {
      if (!item.isFile()) continue;
      if (/\.png$/i.test(item.name) || item.name === 'KayKit-diagnostic.json') {
        planned.push({ path: join(folder, item.name), reason: `capture temporaire (${versionKey} archivé)` });
      }
    }
  }
}

if (archives) {
  const groups = new Map();
  for (const entry of files) {
    const match = /^(.+)-v(\d+)([a-z]?)-review\.zip$/.exec(entry.name);
    if (!match || !entry.isFile()) continue;
    const info = await stat(join(root, entry.name));
    if (info.size < 1024) continue;
    if (!groups.has(match[1])) groups.set(match[1], []);
    groups.get(match[1]).push({ name: entry.name, major: Number(match[2]), suffix: match[3], mtime: info.mtimeMs });
  }
  for (const list of groups.values()) {
    list.sort((a, b) => b.major - a.major || b.suffix.localeCompare(a.suffix) || b.mtime - a.mtime);
    for (const old of list.slice(keep)) {
      planned.push({ path: join(root, old.name), reason: `ZIP ancien (conservation : ${keep})` });
    }
  }
}

console.log(apply ? 'Nettoyage des reviews :' : 'Prévisualisation (aucun fichier supprimé) :');
if (!planned.length) console.log('  Aucun fichier temporaire à supprimer.');
for (const item of planned) {
  console.log(`  ${apply ? 'SUPPRESSION' : 'À supprimer'}  ${item.path.slice(root.length + 1)} — ${item.reason}`);
  if (apply) await rm(item.path, { force: true });
}
if (apply && labStat?.isDirectory() && !labStat.isSymbolicLink()) {
  for (const version of await readdir(lab, { withFileTypes: true })) {
    if (!version.isDirectory() || !/^v\d{2,4}[a-z]?$/.test(version.name)) continue;
    // Only remove directories that became empty. Never recurse into source assets.
    await rmdir(join(lab, version.name)).catch(error => { if (error.code !== 'ENOTEMPTY') throw error; });
  }
  await rmdir(lab).catch(error => { if (error.code !== 'ENOTEMPTY') throw error; });
}
console.log(apply ? `Terminé : ${planned.length} fichier(s) supprimé(s).` : `Candidats : ${planned.length}. Pour appliquer : npm run review:clean -- --apply`);
