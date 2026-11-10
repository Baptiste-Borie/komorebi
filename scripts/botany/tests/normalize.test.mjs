import assert from 'node:assert/strict';
import test from 'node:test';
import { renderResearchDossier } from '../lib/dossier.mjs';
import { assertResearchDossier, normalizeResearch } from '../lib/normalize.mjs';

const provenance = (sourceId) => ({ sourceId, sourceUrl: `https://example.test/${sourceId}`, retrievedOn: '2026-11-10T00:00:00.000Z', verification: 'unverified-import', confidence: null, licenseNotes: 'Test fixture.' });

test('normalization preserves disagreements and keeps artistic interpretation empty', () => {
  const gbif = {
    sourceId: 'gbif', requestCount: 1,
    resolution: { status: 'resolved', acceptedScientificName: 'Betula pendula Roth', gbifTaxonKey: '123', matchType: 'EXACT', confidence: 99, issues: [], alternatives: [] },
    facts: [{ path: 'taxonomy.family', value: 'Betulaceae', provenance: provenance('gbif') }],
  };
  const trefle = { sourceId: 'trefle', status: 'complete', requestCount: 2, note: 'fixture', images: [], facts: [{ path: 'taxonomy.family', value: 'Different family', provenance: provenance('trefle') }] };
  const dossier = normalizeResearch({ inputName: 'Betula pendula', slug: 'betula-pendula', retrievedOn: '2026-11-10T00:00:00.000Z', gbif, adapters: [trefle] });
  assert.equal(dossier.conflicts.length, 1);
  assert.deepEqual(dossier.artisticInterpretations, []);
  assertResearchDossier(dossier);
  assert.match(renderResearchDossier(dossier), /Automated research dossier/);
});

test('validation rejects automated artistic interpretations', () => {
  assert.throws(() => assertResearchDossier({ schemaVersion: 1, request: { inputName: 'A b', retrievedOn: '2026-11-10' }, resolution: { status: 'resolved' }, facts: [], images: { reusable: [], metadataOnly: [], rejected: [] }, artisticInterpretations: [{}] }), /must not contain artistic/);
});
