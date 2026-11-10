import { stripHtml } from '../lib/http.mjs';

const SOURCE_ID = 'wikimedia-commons';
const API = 'https://commons.wikimedia.org/w/api.php';
const REUSABLE_LICENSE = /^(CC0|Public domain|Public Domain Mark|CC BY(?:-SA)?(?: |$))/i;

function inferSubjects(text) {
  const value = text.toLowerCase();
  const subjects = [];
  if (/habit|whole|tree|shrub|plant|solitary|landscape/.test(value)) subjects.push('whole-plant');
  if (/mature|old|ancient/.test(value)) subjects.push('mature-specimen');
  if (/trunk|stem|bark/.test(value)) subjects.push('trunk-or-stem');
  if (/branch|twig|winter/.test(value)) subjects.push('branch-structure');
  if (/leaf|leaves|foliage/.test(value)) subjects.push('leaves');
  if (/flower|catkin|blossom/.test(value)) subjects.push('flowers');
  if (/fruit|seed|cone|acorn|berry/.test(value)) subjects.push('fruits');
  return subjects;
}

export async function researchCommons(name, client) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrsearch: `"${name}" filetype:bitmap`,
    gsrnamespace: '6', gsrlimit: '18', prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '640',
    iiextmetadatafilter: 'Artist|Attribution|LicenseShortName|LicenseUrl|UsageTerms|Restrictions|ImageDescription|Categories',
  });
  const url = `${API}?${params}`;
  const response = await client.getJson(url, { sourceId: SOURCE_ID, minIntervalMs: 500 });
  const images = [];
  for (const page of Object.values(response.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const metadata = info.extmetadata ?? {};
    const license = stripHtml(metadata.LicenseShortName?.value) || null;
    const photographer = stripHtml(metadata.Attribution?.value || metadata.Artist?.value) || 'Unknown';
    const restrictions = stripHtml(metadata.Restrictions?.value);
    const description = stripHtml(metadata.ImageDescription?.value);
    const context = `${page.title} ${description} ${stripHtml(metadata.Categories?.value)}`;
    const speciesEvidence = `${page.title} ${description}`;
    const speciesMatch = speciesEvidence.toLocaleLowerCase().includes(name.toLocaleLowerCase());
    const reusable = Boolean(speciesMatch && license && REUSABLE_LICENSE.test(license) && photographer !== 'Unknown' && !restrictions);
    const rejectionReason = reusable
      ? null
      : !speciesMatch
        ? 'Candidate metadata does not mention the resolved scientific name.'
        : restrictions
          ? `Commons restrictions field is not empty: ${restrictions}`
          : 'Missing creator or licence outside the explicit CC0/public-domain/CC BY/CC BY-SA allowlist.';
    images.push({
      sourceId: SOURCE_ID,
      sourcePage: info.descriptionurl,
      imageUrl: info.url,
      thumbnailUrl: info.thumburl ?? null,
      photographer,
      license,
      licenseUrl: metadata.LicenseUrl?.value ?? null,
      observationLicense: null,
      reusable,
      rejectionReason,
      subjects: inferSubjects(context),
      title: page.title,
      width: info.width,
      height: info.height,
    });
  }
  return { sourceId: SOURCE_ID, status: 'complete', note: `${images.length} Commons candidates inspected with machine-readable metadata.`, facts: [], images };
}
