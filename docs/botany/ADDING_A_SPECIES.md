# Adding a species to the Botanical Library

The library is intentionally local and review-led. Gameplay never needs the network.

1. Resolve the accepted name in an authoritative taxonomic source (normally POWO, corroborated by GBIF). Define the target context: open-grown, woodland, managed, age class and region.
2. Read at least two authoritative morphology sources. Store each statement as a `BotanicalClaim` with source IDs. Use `unknown(...)` when evidence is absent or contradictory.
3. Add `src/botany/species/<camelCaseName>.ts` using `BotanicalSpeciesProfile`. Include access dates, URLs, intended use, automation status and licence notes for every source.
4. Add a separate `<camelCaseName>Procedural.ts`. Every numeric rendering range must say it is an artistic interpretation and point back to one or more botanical claim paths. Never move an inferred renderer value into the botanical profile.
5. Build `docs/botany/references/<species-id>/manifest.json`. For every candidate image record the original page, original file, creator, exact licence, modifications and whether redistribution is allowed. A page saying “copyright” or lacking a clear licence is metadata-only.
6. Prefer Commons files verified through `imageinfo` with `extmetadata`. iNaturalist photos are usable only after checking the photo’s own licence (not merely the observation licence). Keep non-commercial or no-derivatives material out of distributable game assets unless the project has explicitly chosen compatible terms.
7. Generate a board only from compatible images. Run `node scripts/build_botanical_reference_board.mjs <species-id>`; verify the board visually and keep all attribution in the manifest and on the board.
8. Export the new profiles from `src/botany/index.ts`, run `npm run botany:validate`, then `npm run build`.

Review checklist: accepted taxon; target context; claim-level provenance; facts/interpretations separated; unknowns explicit; image creator and licence verified; no runtime fetches; dossier readable without opening source code.
