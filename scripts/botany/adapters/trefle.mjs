const SOURCE_ID = 'trefle';
const BASE = 'https://trefle.io/api/v1';

const present = (value) => value !== null && value !== undefined && !(typeof value === 'object' && Object.keys(value).length === 0);

export async function researchTrefle(name, token, client, retrievedOn) {
  if (!token) return { sourceId: SOURCE_ID, status: 'skipped', note: 'TREFLE_TOKEN is not set; optional Trefle enrichment skipped.', facts: [], images: [] };
  const searchUrl = `${BASE}/species/search?q=${encodeURIComponent(name)}&token=${encodeURIComponent(token)}`;
  const search = await client.getJson(searchUrl, { sourceId: SOURCE_ID, minIntervalMs: 500 });
  const exact = (search.data ?? []).filter((record) => record.scientific_name?.localeCompare(name, undefined, { sensitivity: 'base' }) === 0);
  if (exact.length !== 1) return { sourceId: SOURCE_ID, status: 'skipped', note: `Trefle returned ${exact.length} exact records; no record silently selected.`, facts: [], images: [] };
  const detailUrl = `${BASE}/species/${exact[0].id}?token=${encodeURIComponent(token)}`;
  const detail = (await client.getJson(detailUrl, { sourceId: SOURCE_ID, minIntervalMs: 500 })).data ?? {};
  const publicDetailUrl = `${BASE}/species/${exact[0].id}`;
  const fields = [
    ['taxonomy.importedFamily', detail.family],
    ['taxonomy.importedCommonName', detail.common_name],
    ['taxonomy.importedSynonyms', detail.synonyms],
    ['morphology.importedGrowth', detail.growth],
    ['morphology.importedSpecifications', detail.specifications],
    ['environment.importedDistribution', detail.distribution],
    ['phenology.importedDuration', detail.duration],
  ];
  const sourceSummary = (detail.sources ?? []).map((source) => ({ name: source.name, url: source.url, citation: source.citation, lastUpdate: source.last_update }));
  const facts = fields.filter(([, value]) => present(value)).map(([path, value]) => ({
    path, value,
    provenance: { sourceId: SOURCE_ID, sourceUrl: publicDetailUrl, retrievedOn, verification: 'unverified-import', confidence: null, licenseNotes: 'Trefle-origin data is CC BY 4.0; upstream data retains its source licence. Review the included source summary before promotion.' },
    note: sourceSummary.length ? `Upstream sources: ${JSON.stringify(sourceSummary)}` : 'No upstream source records returned by Trefle.',
  }));
  return { sourceId: SOURCE_ID, status: 'complete', note: `${facts.length} non-empty Trefle fields imported for manual verification.`, facts, images: [] };
}
