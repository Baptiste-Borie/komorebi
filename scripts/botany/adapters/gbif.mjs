const SOURCE_ID = 'gbif';
const BASE = 'https://api.gbif.org';

const compactCandidate = (item) => ({
  key: String(item.key ?? item.nubKey ?? ''),
  name: item.scientificName ?? item.canonicalName ?? '',
  rank: item.rank ?? '',
  status: item.taxonomicStatus ?? item.status ?? '',
});

const resultArray = (value) => Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : [];

export async function researchGbif(name, client, retrievedOn) {
  const matchUrl = `${BASE}/v2/species/match?scientificName=${encodeURIComponent(name)}`;
  const match = await client.getJson(matchUrl, { sourceId: SOURCE_ID, minIntervalMs: 250 });
  const usage = match.usage ?? null;
  const diagnostics = match.diagnostics ?? {};
  const issues = [...(diagnostics.issues ?? [])];
  if (diagnostics.note) issues.push(diagnostics.note);
  const confidence = Number.isFinite(diagnostics.confidence) ? diagnostics.confidence : null;
  const exact = diagnostics.matchType === 'EXACT' && confidence !== null && confidence >= 95;

  if (!usage || !exact) {
    const searchUrl = `${BASE}/v1/species/search?q=${encodeURIComponent(name)}&limit=10`;
    const search = await client.getJson(searchUrl, { sourceId: SOURCE_ID, minIntervalMs: 250 });
    return {
      sourceId: SOURCE_ID,
      resolution: {
        status: usage ? 'manual-review' : 'unresolved', acceptedScientificName: null, gbifTaxonKey: null,
        matchType: diagnostics.matchType ?? null, confidence, issues: issues.length ? issues : ['GBIF did not return a high-confidence exact match.'],
        alternatives: (search.results ?? []).map(compactCandidate),
      },
      facts: [], synonyms: [], identifiers: [], sourceUrl: matchUrl,
    };
  }

  const accepted = match.acceptedUsage ?? usage;
  const key = String(accepted.key ?? usage.key);
  const detailUrl = `${BASE}/v1/species/${encodeURIComponent(key)}`;
  const synonymsUrl = `${detailUrl}/synonyms`;
  const identifiersUrl = `${detailUrl}/identifier`;
  const detail = await client.getJson(detailUrl, { sourceId: SOURCE_ID, minIntervalMs: 250 });
  const synonyms = await client.getJson(synonymsUrl, { sourceId: SOURCE_ID, minIntervalMs: 250 });
  const identifiers = await client.getJson(identifiersUrl, { sourceId: SOURCE_ID, minIntervalMs: 250 });
  const source = (path, value, note) => ({
    path, value,
    provenance: { sourceId: SOURCE_ID, sourceUrl: detailUrl, retrievedOn, verification: 'verified-authoritative', confidence, licenseNotes: 'GBIF backbone-derived taxonomic fact; cite GBIF and originating checklist for publication.' },
    ...(note ? { note } : {}),
  });
  const facts = [
    source('taxonomy.acceptedScientificName', accepted.name ?? detail.scientificName),
    source('taxonomy.canonicalName', accepted.canonicalName ?? detail.canonicalName),
    source('taxonomy.rank', accepted.rank ?? detail.rank),
    source('taxonomy.status', accepted.status ?? detail.taxonomicStatus),
    ...((match.classification ?? []).map((entry) => source(`taxonomy.classification.${String(entry.rank).toLowerCase()}`, entry.name))),
  ].filter((fact) => fact.value !== undefined && fact.value !== null);
  if (match.synonym) facts.push(source('taxonomy.submittedNameIsSynonym', true, `Matched synonym ${usage.name}; accepted usage is ${accepted.name}.`));

  const synonymRecords = resultArray(synonyms).map(compactCandidate);
  const identifierRecords = resultArray(identifiers).map((item) => ({ identifier: item.identifier, title: item.title ?? null, source: item.source ?? null }));
  const family = match.classification?.find((entry) => entry.rank === 'FAMILY')?.name;
  if (family) facts.push(source('taxonomy.family', family));
  if (synonymRecords.length) facts.push(source('taxonomy.gbifSynonyms', synonymRecords));
  if (identifierRecords.length) facts.push(source('taxonomy.identifiers', identifierRecords));

  return {
    sourceId: SOURCE_ID,
    resolution: {
      status: 'resolved', acceptedScientificName: accepted.name ?? detail.scientificName ?? null, gbifTaxonKey: key,
      matchType: diagnostics.matchType, confidence, issues, alternatives: [],
    },
    facts,
    synonyms: synonymRecords,
    identifiers: identifierRecords,
    sourceUrl: detailUrl,
  };
}
