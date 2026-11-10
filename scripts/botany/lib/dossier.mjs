const escaped = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const compactValue = (value) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 240 ? `${text.slice(0, 237)}…` : text;
};

export function renderResearchDossier(data) {
  const lines = [
    `# Automated research dossier — ${data.request.inputName}`,
    '',
    `Generated ${data.request.retrievedOn}. Status: **${data.resolution.status}**. This is an unreviewed research draft, not a scientific species profile.`,
    '',
    '## Taxon resolution',
    '',
    `- Accepted name: ${data.resolution.acceptedScientificName ?? 'unresolved'}`,
    `- GBIF key: ${data.resolution.gbifTaxonKey ?? 'unknown'}`,
    `- Match: ${data.resolution.matchType ?? 'unknown'}; confidence ${data.resolution.confidence ?? 'unknown'}`,
    `- Issues: ${data.resolution.issues.length ? data.resolution.issues.join('; ') : 'none reported'}`,
    '',
  ];
  if (data.resolution.alternatives.length) {
    lines.push('### Candidates requiring review', '', '| Name | Rank | Status | Key |', '| --- | --- | --- | --- |');
    for (const item of data.resolution.alternatives) lines.push(`| ${escaped(item.name)} | ${escaped(item.rank)} | ${escaped(item.status)} | ${escaped(item.key)} |`);
    lines.push('');
  }
  lines.push('## Imported facts', '', '| Field | Value | Verification | Source |', '| --- | --- | --- | --- |');
  for (const fact of data.facts) {
    lines.push(`| ${escaped(fact.path)} | ${escaped(compactValue(fact.value))} | ${escaped(fact.provenance.verification)} | [${escaped(fact.provenance.sourceId)}](${fact.provenance.sourceUrl}) |`);
  }
  if (!data.facts.length) lines.push('| — | No facts imported | — | — |');
  lines.push('', '## Conflicts', '');
  if (!data.conflicts.length) lines.push('No field-level conflicts detected among imported facts.');
  else for (const conflict of data.conflicts) lines.push(`- \`${conflict.path}\`: ${conflict.values.map(compactValue).join(' versus ')} (${conflict.sourceIds.join(', ')})`);
  lines.push('', '## Missing reviewed characteristics', '', ...data.missing.map((path) => `- ${path}`), '');

  lines.push('## Reusable image candidates', '', '| Source | Subjects | Photographer | Licence | Record |', '| --- | --- | --- | --- | --- |');
  for (const image of data.images.reusable) {
    const license = image.licenseUrl ? `[${escaped(image.license)}](${image.licenseUrl})` : escaped(image.license);
    lines.push(`| ${image.sourceId} | ${escaped(image.subjects.join(', ') || 'unclassified')} | ${escaped(image.photographer)} | ${license} | [source](${image.sourcePage}) |`);
  }
  if (!data.images.reusable.length) lines.push('| — | — | — | No reusable candidate found | — |');
  lines.push('', `${data.images.rejected.length} additional candidate(s) were rejected or retained as metadata only because creator/licence requirements were not satisfied. See \`research.json\` for reasons.`, '');

  lines.push('## Source runs', '', '| Source | Status | Network requests | Note |', '| --- | --- | ---: | --- |');
  for (const run of data.sourceRuns) lines.push(`| ${run.sourceId} | ${run.status} | ${run.requestCount} | ${escaped(run.note)} |`);
  lines.push('', '## Review boundary', '', ...data.reviewNotes.map((note) => `- ${note}`), '', 'Artistic interpretations: **none**.', '');
  return `${lines.join('\n').trimEnd()}\n`;
}
