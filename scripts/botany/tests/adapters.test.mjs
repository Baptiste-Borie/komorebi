import assert from 'node:assert/strict';
import test from 'node:test';
import { researchCommons } from '../adapters/commons.mjs';
import { researchGbif } from '../adapters/gbif.mjs';
import { researchInaturalist } from '../adapters/inaturalist.mjs';
import { researchTrefle } from '../adapters/trefle.mjs';

class FakeClient {
  constructor(responses) { this.responses = [...responses]; }
  async getJson(url) {
    const next = this.responses.shift();
    assert.ok(next, `Unexpected request ${url}`);
    assert.match(url, next.match);
    return structuredClone(next.data);
  }
}

test('GBIF accepts only a high-confidence exact match and imports classification', async () => {
  const client = new FakeClient([
    { match: /v2\/species\/match/, data: { usage: { key: '123', name: 'Betula pendula Roth', canonicalName: 'Betula pendula', rank: 'SPECIES', status: 'ACCEPTED' }, classification: [{ key: '1', name: 'Betulaceae', rank: 'FAMILY' }], diagnostics: { matchType: 'EXACT', confidence: 99 }, synonym: false } },
    { match: /v1\/species\/123$/, data: { key: 123, scientificName: 'Betula pendula Roth' } },
    { match: /\/synonyms$/, data: { results: [{ key: 4, scientificName: 'Betula verrucosa Ehrh.', rank: 'SPECIES', taxonomicStatus: 'SYNONYM' }] } },
    { match: /\/identifier$/, data: { results: [{ identifier: 'urn:test:123', title: 'Test' }] } },
  ]);
  const result = await researchGbif('Betula pendula', client, '2026-11-10T00:00:00.000Z');
  assert.equal(result.resolution.status, 'resolved');
  assert.equal(result.resolution.gbifTaxonKey, '123');
  assert.equal(result.facts.find((fact) => fact.path === 'taxonomy.classification.family').value, 'Betulaceae');
  assert.equal(result.facts.find((fact) => fact.path === 'taxonomy.family').value, 'Betulaceae');
  assert.equal(result.synonyms[0].name, 'Betula verrucosa Ehrh.');
});

test('GBIF exposes alternatives instead of silently selecting a fuzzy match', async () => {
  const client = new FakeClient([
    { match: /v2\/species\/match/, data: { usage: { key: '7', name: 'Betula pendula' }, diagnostics: { matchType: 'FUZZY', confidence: 82 } } },
    { match: /v1\/species\/search/, data: { results: [{ key: 7, scientificName: 'Betula pendula Roth', rank: 'SPECIES', taxonomicStatus: 'ACCEPTED' }] } },
  ]);
  const result = await researchGbif('Betula pendulla', client, '2026-11-10T00:00:00.000Z');
  assert.equal(result.resolution.status, 'manual-review');
  assert.equal(result.resolution.acceptedScientificName, null);
  assert.equal(result.resolution.alternatives.length, 1);
});

test('iNaturalist preserves observation and photo licences separately', async () => {
  const client = new FakeClient([
    { match: /\/taxa\?/, data: { results: [{ id: 83992, is_active: true, name: 'Betula pendula', preferred_common_name: 'silver birch' }] } },
    { match: /\/observations\?/, data: { results: [{ id: 10, uri: 'https://www.inaturalist.org/observations/10', quality_grade: 'research', license_code: 'cc-by-nc', user: { login: 'observer' }, photos: [{ id: 20, license_code: 'cc-by', attribution_name: 'Photographer', url: 'https://static.inaturalist.org/photos/20/square.jpg' }, { id: 21, license_code: 'cc-by', attribution_name: 'Second', url: 'https://static.inaturalist.org/photos/21/square.jpg' }] }] } },
  ]);
  const result = await researchInaturalist('Betula pendula', client, '2026-11-10T00:00:00.000Z');
  assert.equal(result.images[0].license, 'cc-by');
  assert.equal(result.images[0].observationLicense, 'cc-by-nc');
  assert.equal(result.images[0].reusable, true);
  assert.match(result.images[0].imageUrl, /original\.jpg$/);
  assert.equal(result.images.length, 1);
});

test('Commons rejects unclear rights and accepts explicit CC BY-SA metadata', async () => {
  const client = new FakeClient([{ match: /commons\.wikimedia\.org/, data: { query: { pages: {
    1: { index: 1, title: 'File:Betula pendula bark.jpg', imageinfo: [{ url: 'https://upload/1.jpg', thumburl: 'https://thumb/1.jpg', descriptionurl: 'https://commons/wiki/1', width: 100, height: 200, extmetadata: { Artist: { value: '<b>Alice</b>' }, LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' }, ImageDescription: { value: 'Mature trunk bark' }, Restrictions: { value: '' } } }] },
    2: { index: 2, title: 'File:Unknown.jpg', imageinfo: [{ url: 'https://upload/2.jpg', descriptionurl: 'https://commons/wiki/2', extmetadata: {} }] },
  } } } }]);
  const result = await researchCommons('Betula pendula', client);
  assert.equal(result.images[0].reusable, true);
  assert.deepEqual(result.images[0].subjects, ['mature-specimen', 'trunk-or-stem']);
  assert.equal(result.images[1].reusable, false);
});

test('Trefle skips without requiring a token or making a request', async () => {
  const result = await researchTrefle('Betula pendula', '', { getJson: () => assert.fail('must not request') }, '2026-11-10T00:00:00.000Z');
  assert.equal(result.status, 'skipped');
  assert.match(result.note, /TREFLE_TOKEN/);
});
