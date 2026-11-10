const EXPECTED_FACT_PATHS = [
  'taxonomy.acceptedScientificName',
  'taxonomy.family',
  'taxonomy.commonNames',
  'morphology.growthHabit',
  'morphology.matureHeightMetres',
  'morphology.matureSpreadMetres',
  'morphology.overallSilhouette',
  'morphology.crownArchitecture',
  'morphology.trunkMorphology',
  'morphology.branchingStructure',
  'morphology.bark',
  'morphology.leaves',
  'morphology.leafArrangement',
  'morphology.foliageDistribution',
  'phenology.foliage',
  'phenology.flowering',
  'phenology.fruiting',
  'environment.light',
  'environment.soilAndMoisture',
  'environment.architectureInfluences',
];

const stableValue = (value) => JSON.stringify(value, Object.keys(value && typeof value === 'object' && !Array.isArray(value) ? value : {}).sort());

export function normalizeResearch({ inputName, slug, retrievedOn, gbif, adapters }) {
  const facts = [gbif?.facts ?? [], ...adapters.map((adapter) => adapter.facts ?? [])].flat();
  const byPath = new Map();
  for (const fact of facts) {
    const values = byPath.get(fact.path) ?? [];
    values.push(fact);
    byPath.set(fact.path, values);
  }
  const conflicts = [];
  for (const [path, entries] of byPath) {
    const distinct = new Map(entries.map((entry) => [stableValue(entry.value), entry]));
    if (distinct.size > 1) {
      conflicts.push({ path, values: [...distinct.values()].map((entry) => entry.value), sourceIds: [...new Set(entries.map((entry) => entry.provenance.sourceId))] });
    }
  }
  const missing = EXPECTED_FACT_PATHS.filter((path) => !byPath.has(path));
  const allImages = adapters.flatMap((adapter) => adapter.images ?? []);
  const reusable = allImages.filter((image) => image.reusable);
  const rejected = allImages.filter((image) => !image.reusable);
  const metadataOnly = allImages.filter((image) => image.sourceId === 'inaturalist' && !image.reusable && image.license);
  const sourceRuns = [gbif, ...adapters].filter(Boolean).map((result) => ({
    sourceId: result.sourceId,
    status: result.status ?? (result.resolution ? 'complete' : 'failed'),
    requestCount: result.requestCount ?? 0,
    note: result.note ?? (result.resolution?.status === 'resolved' ? 'Taxon resolved.' : 'Taxon requires review.'),
  }));
  const reviewNotes = [
    'This is an automatically collected draft, not a reviewed BotanicalSpeciesProfile.',
    'Promote claims only after checking the cited source and reconciling conflicts.',
    'No procedural or artistic parameters are generated automatically.',
  ];
  if (conflicts.length) reviewNotes.push(`${conflicts.length} conflicting field(s) require manual review.`);
  if (gbif.resolution.status !== 'resolved') reviewNotes.push('GBIF resolution is not definitive; downstream taxon-specific selection was intentionally withheld.');

  return {
    schemaVersion: 1,
    request: { inputName, slug, retrievedOn },
    resolution: gbif.resolution,
    facts,
    conflicts,
    missing,
    images: { reusable, metadataOnly, rejected },
    sourceRuns,
    artisticInterpretations: [],
    reviewNotes,
  };
}

export function assertResearchDossier(dossier) {
  const errors = [];
  if (dossier.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!dossier.request?.inputName || !dossier.request?.retrievedOn) errors.push('request metadata is incomplete');
  if (!['resolved', 'manual-review', 'unresolved'].includes(dossier.resolution?.status)) errors.push('resolution status is invalid');
  for (const fact of dossier.facts ?? []) {
    if (!fact.path || fact.value === undefined) errors.push('fact requires path and value');
    for (const key of ['sourceId', 'sourceUrl', 'retrievedOn', 'verification', 'licenseNotes']) {
      if (!fact.provenance?.[key]) errors.push(`${fact.path ?? '<fact>'}: provenance.${key} is required`);
    }
  }
  for (const image of [...(dossier.images?.reusable ?? []), ...(dossier.images?.metadataOnly ?? []), ...(dossier.images?.rejected ?? [])]) {
    if (!image.sourcePage || !image.photographer) errors.push('image requires sourcePage and photographer');
    if (image.reusable && !image.license) errors.push(`${image.sourcePage}: reusable image requires a licence`);
  }
  if ((dossier.artisticInterpretations ?? []).length !== 0) errors.push('automated dossier must not contain artistic interpretations');
  if (errors.length) throw new Error(`Research dossier validation failed:\n- ${errors.join('\n- ')}`);
}
