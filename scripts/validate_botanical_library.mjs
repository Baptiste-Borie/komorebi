import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { assertResearchDossier } from './botany/lib/normalize.mjs';

const manifestPath = path.resolve('docs/botany/references/quercus-robur/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const errors = [];
if (manifest.schemaVersion !== 1) errors.push('manifest schemaVersion must be 1');
if (!manifest.speciesId) errors.push('manifest speciesId is required');
if (!Array.isArray(manifest.images) || manifest.images.length < 6) errors.push('manifest needs the six target reference subjects');

const requiredSubjects = new Set(['silhouette', 'open-grown', 'root-flare', 'branching', 'bark', 'leaves']);
for (const image of manifest.images ?? []) {
  for (const key of ['id', 'sourcePage', 'originalFile', 'photographer', 'license', 'redistribution']) {
    if (!image[key]) errors.push(`${image.id ?? '<image>'}: ${key} is required`);
  }
  for (const subject of image.subjects ?? []) requiredSubjects.delete(subject);
  if (image.redistribution === 'bundled') {
    if (!image.localPath) errors.push(`${image.id}: bundled image needs localPath`);
    else {
      try { await access(path.resolve(path.dirname(manifestPath), image.localPath)); }
      catch { errors.push(`${image.id}: missing ${image.localPath}`); }
    }
  }
}
for (const subject of requiredSubjects) errors.push(`reference subject not covered: ${subject}`);

for (const requiredFile of [
  'src/botany/species/quercusRobur.ts',
  'src/botany/species/quercusRoburProcedural.ts',
  'docs/botany/QUERCUS_ROBUR_DOSSIER.md',
  'docs/botany/ADDING_A_SPECIES.md',
  'docs/botany/references/quercus-robur/reference-board.jpg',
]) {
  try { await access(path.resolve(requiredFile)); }
  catch { errors.push(`missing required file: ${requiredFile}`); }
}

const researchRoot = path.resolve('docs/botany/research');
let researchCount = 0;
try {
  for (const entry of await readdir(researchRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const researchPath = path.join(researchRoot, entry.name, 'research.json');
    try {
      assertResearchDossier(JSON.parse(await readFile(researchPath, 'utf8')));
      await access(path.join(researchRoot, entry.name, 'DOSSIER.md'));
      researchCount += 1;
    }
    catch (error) { errors.push(`${entry.name}: ${error instanceof Error ? error.message : error}`); }
  }
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

if (errors.length) throw new Error(`Botanical Library validation failed:\n- ${errors.join('\n- ')}`);
console.log(`Botanical Library valid: ${manifest.speciesId}, ${manifest.images.length} references, ${researchCount} automated research dossier(s).`);
