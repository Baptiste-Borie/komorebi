const SOURCE_ID = 'inaturalist';
const BASE = 'https://api.inaturalist.org/v1';
const REUSABLE_PHOTO_LICENSES = new Set(['cc0', 'cc-by', 'cc-by-sa']);
const LICENSE_URLS = {
  cc0: 'https://creativecommons.org/publicdomain/zero/1.0/',
  'cc-by': 'https://creativecommons.org/licenses/by/4.0/',
  'cc-by-sa': 'https://creativecommons.org/licenses/by-sa/4.0/',
};

const photoUrl = (url, size) => url?.replace(/\/(square|small|medium|large|original)\./, `/${size}.`) ?? null;

export async function researchInaturalist(name, client, retrievedOn) {
  const taxonUrl = `${BASE}/taxa?q=${encodeURIComponent(name)}&rank=species&per_page=10`;
  const taxa = await client.getJson(taxonUrl, { sourceId: SOURCE_ID, minIntervalMs: 1_050 });
  const exact = (taxa.results ?? []).filter((taxon) => taxon.is_active && taxon.name?.localeCompare(name, undefined, { sensitivity: 'base' }) === 0);
  if (exact.length !== 1) {
    return { sourceId: SOURCE_ID, status: 'skipped', note: `Expected one active exact taxon, found ${exact.length}; no observation taxon was silently selected.`, facts: [], images: [], taxon: null };
  }
  const taxon = exact[0];
  const observationsUrl = `${BASE}/observations?taxon_id=${taxon.id}&quality_grade=research&photos=true&photo_license=cc0%2Ccc-by%2Ccc-by-sa&per_page=12&order_by=votes&order=desc`;
  const observations = await client.getJson(observationsUrl, { sourceId: SOURCE_ID, minIntervalMs: 1_050 });
  const images = [];
  for (const observation of observations.results ?? []) {
    for (const photo of (observation.photos ?? []).slice(0, 1)) {
      const license = photo.license_code?.toLowerCase() ?? null;
      const reusable = REUSABLE_PHOTO_LICENSES.has(license);
      const attribution = photo.attribution ?? '';
      const photographer = photo.attribution_name
        ?? (/^\(c\)|©/i.test(attribution) ? attribution : null)
        ?? observation.user?.name
        ?? observation.user?.login
        ?? attribution
        ?? 'Unknown';
      images.push({
        sourceId: SOURCE_ID,
        sourcePage: observation.uri ?? `https://www.inaturalist.org/observations/${observation.id}`,
        imageUrl: photoUrl(photo.url, 'original'),
        thumbnailUrl: photoUrl(photo.url, 'medium'),
        photographer,
        license,
        licenseUrl: license ? LICENSE_URLS[license] ?? null : null,
        observationLicense: observation.license_code ?? null,
        reusable,
        rejectionReason: reusable ? null : 'Photo licence is absent or outside the pipeline reuse allowlist.',
        subjects: [],
        observationId: observation.id,
        qualityGrade: observation.quality_grade,
        identificationsMostAgree: observation.identifications_most_agree ?? null,
        observedOn: observation.observed_on ?? null,
      });
    }
  }
  const facts = [
    {
      path: 'observations.iNaturalistTaxonId', value: taxon.id,
      provenance: { sourceId: SOURCE_ID, sourceUrl: taxonUrl, retrievedOn, verification: 'corroborating-observation', confidence: null, licenseNotes: 'Taxon/observation metadata only; each photo carries a separate licence recorded on the image entry.' },
    },
    ...(taxon.preferred_common_name ? [{
      path: 'taxonomy.importedCommonName', value: taxon.preferred_common_name,
      provenance: { sourceId: SOURCE_ID, sourceUrl: taxonUrl, retrievedOn, verification: 'unverified-import', confidence: null, licenseNotes: 'Community taxon metadata; requires botanical review before promotion to a species profile.' },
    }] : []),
  ];
  return { sourceId: SOURCE_ID, status: 'complete', note: `${observations.results?.length ?? 0} research-grade observations inspected; at most one representative photo retained per observation.`, facts, images, taxon: { id: taxon.id, name: taxon.name } };
}
