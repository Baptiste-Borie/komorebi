import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { researchCommons } from './adapters/commons.mjs';
import { researchGbif } from './adapters/gbif.mjs';
import { researchInaturalist } from './adapters/inaturalist.mjs';
import { researchTrefle } from './adapters/trefle.mjs';
import { renderResearchDossier } from './lib/dossier.mjs';
import { CachedHttpClient } from './lib/http.mjs';
import { assertResearchDossier, normalizeResearch } from './lib/normalize.mjs';

const slugify = (name) => name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function parseArgs(argv) {
  const options = { refresh: false, offline: false, outputRoot: path.resolve('docs/botany/research') };
  const names = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--refresh') options.refresh = true;
    else if (arg === '--offline') options.offline = true;
    else if (arg === '--output') options.outputRoot = path.resolve(argv[++index] ?? '');
    else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
    else names.push(arg);
  }
  const name = names.join(' ').trim().replace(/\s+/g, ' ');
  if (!name) throw new Error('Usage: npm run botany:research -- "Scientific name" [--refresh|--offline]');
  if (name.length > 160 || !/\p{L}+[ .×'’-]+\p{L}/u.test(name)) throw new Error(`Invalid scientific name: ${name}`);
  return { name, ...options };
}

async function safely(sourceId, action) {
  try { return await action(); }
  catch (error) { return { sourceId, status: 'failed', note: error instanceof Error ? error.message : String(error), facts: [], images: [] }; }
}

export async function runResearch({ name, refresh = false, offline = false, outputRoot = path.resolve('docs/botany/research'), client: suppliedClient } = {}) {
  const retrievedOn = new Date().toISOString();
  const slug = slugify(name);
  const client = suppliedClient ?? new CachedHttpClient({ refresh, offline });
  const gbif = await safely('gbif', () => researchGbif(name, client, retrievedOn));
  if (!gbif.resolution) {
    gbif.resolution = { status: 'unresolved', acceptedScientificName: null, gbifTaxonKey: null, matchType: null, confidence: null, issues: [gbif.note], alternatives: [] };
  }
  const canonicalName = gbif.facts?.find((fact) => fact.path === 'taxonomy.canonicalName')?.value ?? name;
  const resolved = gbif.resolution.status === 'resolved';
  const inaturalist = resolved
    ? await safely('inaturalist', () => researchInaturalist(canonicalName, client, retrievedOn))
    : { sourceId: 'inaturalist', status: 'skipped', note: 'Skipped because GBIF resolution requires manual review.', facts: [], images: [] };
  const commons = await safely('wikimedia-commons', () => researchCommons(canonicalName, client));
  const trefle = resolved
    ? await safely('trefle', () => researchTrefle(canonicalName, process.env.TREFLE_TOKEN, client, retrievedOn))
    : { sourceId: 'trefle', status: 'skipped', note: 'Skipped because GBIF resolution requires manual review.', facts: [], images: [] };
  for (const result of [gbif, inaturalist, commons, trefle]) result.requestCount = client.requestCount?.(result.sourceId) ?? 0;
  const dossier = normalizeResearch({ inputName: name, slug, retrievedOn, gbif, adapters: [inaturalist, commons, trefle] });
  assertResearchDossier(dossier);
  const outputDir = path.join(outputRoot, slug);
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'research.json'), `${JSON.stringify(dossier, null, 2)}\n`);
  await writeFile(path.join(outputDir, 'DOSSIER.md'), renderResearchDossier(dossier));
  return { dossier, outputDir };
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const { dossier, outputDir } = await runResearch(options);
    console.log(`Botanical research ${dossier.resolution.status}: ${dossier.request.inputName}`);
    console.log(`Wrote ${path.relative(process.cwd(), outputDir)}/research.json and DOSSIER.md`);
    if (dossier.resolution.status !== 'resolved') process.exitCode = 2;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
