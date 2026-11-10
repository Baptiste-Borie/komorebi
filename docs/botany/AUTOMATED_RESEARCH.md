# Automated botanical research pipeline

Run:

```bash
npm run botany:research -- "Betula pendula"
```

The command writes `docs/botany/research/betula-pendula/research.json` and `DOSSIER.md`. These are evidence-gathering drafts. They never overwrite reviewed files in `src/botany/species/`, never invent missing traits, and never generate procedural art parameters.

## Workflow

1. GBIF `/v2/species/match` resolves the name. Only a high-confidence exact match is accepted automatically. Fuzzy or weak matches produce `manual-review`, list alternatives from species search, and prevent downstream taxon selection.
2. The accepted canonical name is matched exactly to one active iNaturalist species. Up to 12 research-grade observations are inspected, restricted to CC0, CC BY and CC BY-SA photo searches, with one representative photo retained per observation. Observation and photo licences are stored separately.
3. Wikimedia Commons is queried through the MediaWiki Action API. `imageinfo`/`extmetadata` supplies file, creator and licence fields. The pipeline accepts only explicit CC0, public-domain, CC BY or CC BY-SA records with a creator and no restrictions; everything else is rejected with a reason.
4. If `TREFLE_TOKEN` exists, Trefle search and detail endpoints contribute non-empty structured fields as unverified imports. Without the token the adapter reports `skipped` and the run continues.
5. The normalizer keeps claim-level provenance, reports differing values instead of choosing one, lists missing reviewed-profile characteristics, and produces separate reusable/metadata-only/rejected image lists.

All API responses use a seven-day filesystem cache in `.cache/botany/`. Use `--refresh` to bypass fresh cache entries or `--offline` to forbid network access and require cached responses. iNaturalist calls are serialized at roughly one request per second; other sources also use conservative intervals. Transient 429/5xx responses are retried with backoff.

## Authentication and secrets

`TREFLE_TOKEN` is read from the process environment only:

```bash
TREFLE_TOKEN=... npm run botany:research -- "Betula pendula"
```

`.env`, `.env.*`, and `.cache/botany/` are ignored. Tokens are redacted from cache keys and cached request metadata. No other adapter needs authentication for this read-only workflow.

## Review and promotion

`research.json` conforms to the TypeScript shape in `src/botany/schemas/research.ts` and passes a runtime validator before it is written. Verification labels mean:

- `verified-authoritative`: GBIF backbone taxonomy; authoritative for name resolution, not morphology.
- `corroborating-observation`: field-observation metadata useful for visual research.
- `unverified-import`: aggregator/community data that must be checked against an authoritative botanical description.
- `conflict`: represented in the dossier conflict list; no winner is selected automatically.
- `missing`: expected reviewed-profile field absent from the collected evidence.

To promote a species, a person or development agent must consult authoritative floras/dendrology sources, resolve conflicts, create a `BotanicalSpeciesProfile` with source IDs, then separately author procedural interpretations. Follow [ADDING_A_SPECIES.md](ADDING_A_SPECIES.md).

## Source contracts reviewed

- [GBIF Species API](https://techdocs.gbif.org/en/openapi/v1/species): current v2 name matching plus v1 usage detail/synonym/identifier resources.
- [iNaturalist API recommended practices](https://www.inaturalist.org/pages/api%2Brecommended%2Bpractices): newer API, about one request per second, caching and bounded result sets.
- [MediaWiki Imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo): URL, size and filtered external metadata; external metadata is requested only for a small result set.
- [Trefle fields](https://docs.trefle.io/docs/advanced/plants-fields/): search results are light records and detail calls provide growth, specifications and source data.

Run `npm run botany:test`, `npm run botany:validate`, and `npm run build` before promotion or pipeline changes.
