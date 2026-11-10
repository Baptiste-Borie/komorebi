# Quercus robur L. — botanical dossier

Reviewed 2026-11-09. This dossier targets a mature, open-grown European specimen. It does not describe fastigiate cultivars, managed pollards, or the tall forest-grown form.

## Evidence rules

“Documented” means the statement is directly supported by at least one source listed below. “Interpretation” means a renderer-facing choice inferred from the facts or reference photographs. Unknowns remain unknown. Photographs demonstrate possible appearance of individual specimens; they do not establish dimensions or population-wide traits.

## Botanical profile — documented facts

| Character | Profile | Evidence |
| --- | --- | --- |
| Accepted name | *Quercus robur* L.; accepted species | [Kew POWO](https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:304293-2) |
| Family | Fagaceae | [FloraWeb](https://www.floraweb.de/php/artenhome.php?suchnr=4685), [RHS](https://www.rhs.org.uk/plants/14294/quercus-robur/details) |
| Common names | English oak, common oak, pedunculate oak; French: chêne pédonculé | [RHS](https://www.rhs.org.uk/plants/14294/quercus-robur/details), [Trees and Shrubs Online](https://www.treesandshrubsonline.org/articles/quercus/quercus-robur/) |
| Range | Native from Europe east to Iran; temperate biome | [Kew POWO](https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:304293-2) |
| Habit | Large deciduous tree, spreading-branched when open grown | [RHS](https://www.rhs.org.uk/plants/14294/quercus-robur/details), [Trees and Shrubs Online](https://www.treesandshrubsonline.org/articles/quercus/quercus-robur/) |
| Mature height | RHS gives 20–40 m; FloraWeb records up to 50 m, treated here as an upper extreme rather than the target range | [RHS](https://www.rhs.org.uk/plants/14294/quercus-robur/details), [FloraWeb](https://www.floraweb.de/php/artenhome.php?suchnr=4685) |
| Spread | No robust universal numeric range established in the selected core sources. Open-grown crown may be wider than total tree height | [Trees and Shrubs Online](https://www.treesandshrubsonline.org/articles/quercus/quercus-robur/) |
| Overall silhouette | Broad, spreading head of rugged branches; strong distinction between open-grown and crowded woodland form | [Trees and Shrubs Online](https://www.treesandshrubsonline.org/articles/quercus/quercus-robur/), [RHS](https://www.rhs.org.uk/plants/14294/quercus-robur/details) |
| Trunk and major forks | Trunk commonly divides a few metres above ground into strong, gnarled, twisting limbs | [FloraWeb](https://www.floraweb.de/php/artenhome.php?suchnr=4685) |
| Bark | Deeply fissured with predominantly longitudinal ridges/grooves in maturity | [FloraWeb](https://www.floraweb.de/php/artenhome.php?suchnr=4685), [University College Cork](https://www.ucc.ie/en/tree-explorers/trees/a-z/quercusrobur/) |
| Leaves | 5–15 × 3–10 cm; mature leaves glabrous, pinnately lobed with usually 5–6 rounded lobes, very short 2–7 mm petiole | [FloraWeb](https://www.floraweb.de/php/artenhome.php?suchnr=4685) |
| Leaf arrangement | Alternate | [University College Cork](https://www.ucc.ie/en/tree-explorers/trees/a-z/quercusrobur/) |
| Foliage and seasons | Deciduous; dark-green foliage becomes reddish-brown in autumn; yellow-green catkins in spring; German flora records May flowering | [RHS](https://www.rhs.org.uk/plants/14294/quercus-robur/details), [FloraWeb](https://www.floraweb.de/php/artenhome.php?suchnr=4685) |
| Fruit | Pedunculate acorns, green ripening brown, about 2–2.5 cm long | [RHS](https://www.rhs.org.uk/plants/14294/quercus-robur/details), [Trees and Shrubs Online](https://www.treesandshrubsonline.org/articles/quercus/quercus-robur/) |
| Environment | Full sun to partial shade; broad soil tolerance where soils are deep/fertile and moist but well drained; lime tolerant; can occur on periodically wet sites | [RHS](https://www.rhs.org.uk/plants/14294/quercus-robur/details), [FloraWeb](https://www.floraweb.de/php/artenhome.php?suchnr=4685) |
| Environmental influence on form | Competition matters: close-grown trees can become substantially taller, while open-grown trees develop the broad target crown | [Trees and Shrubs Online](https://www.treesandshrubsonline.org/articles/quercus/quercus-robur/) |

Unknown from the reviewed descriptions: a species-wide numerical root-flare shape, quantitative within-crown foliage distribution, and measured distributions for branch angle or curvature. These are intentionally absent from the scientific profile.

The machine-readable form is [quercusRobur.ts](../../src/botany/species/quercusRobur.ts); every documented field carries source IDs and every unknown carries a reason.

## Procedural interpretation — not botanical measurement

The separate [procedural profile](../../src/botany/species/quercusRoburProcedural.ts) translates the documented relationships into ranges for a future mark renderer. Its main direction is:

- Make the crown broad (width:height prior 1.05–1.45), asymmetrical, and assembled from overlapping opaque masses rather than transparent lace.
- Fork the trunk low, carry thickness continuously into 5–9 dominant boughs, and use strong nonlinear taper rather than a cylinder plus attached branches.
- Give major boughs unequal spacing, shallow-to-rising departure angles, several curvature changes, and different visual weights.
- Widen the trunk-to-ground transition with asymmetric gestures, but label root-flare dimensions as photographic art direction because the botanical descriptions did not establish them.
- Align elongated bark marks mainly with the local stem axis, reflecting the documented longitudinal fissures.

The precise ranges are deliberately editable art-direction priors. They must not be presented as measured traits.

## Reference collection

The collection contains six locally bundled, freely reusable Commons photographs covering open-grown silhouette, leafless branch hierarchy, root transition, bark, leaves and early-spring structure. The complete photographer, source, licence, modification and redistribution record is in [manifest.json](references/quercus-robur/manifest.json).

The generated [reference board](references/quercus-robur/reference-board.jpg) is a visual index, not a replacement for the manifest or full files. Each component retains its listed licence; the board layout and captioning are released under CC BY-SA 4.0. No RHS, Kew, TSO, iNaturalist or other rights-restricted imagery is redistributed.

## Source coverage and automation assessment

| Source | What it contributes now | Future automation | Licence / API decision |
| --- | --- | --- | --- |
| Kew POWO | Accepted name, status, range | Possible with care; prefer approved data services/exports over HTML scraping | Link and cite derived facts; image/text rights are not assumed |
| RHS | Horticultural dimensions, habit, season, growing conditions | Manual review only unless RHS provides permission/API | No scraping or image reuse assumed |
| FloraWeb | Detailed morphology, ecology, German distribution | Manual review; investigate official downloads before any bulk process | No page scraping pipeline |
| Trees and Shrubs Online | Dendrology and open-grown architecture | Manual review | Article and individual image rights need separate handling |
| Trefle | Potential aggregation and normalised plant fields | Token-gated optional adapter; absence of `TREFLE_TOKEN` must skip cleanly | Trefle-origin data is CC BY 4.0, but upstream records keep their own licences and source attribution; inspect each response’s sources |
| GBIF | Taxon resolution, occurrence/distribution records and licensed occurrence media | Recommended for taxon matching and occurrence discovery through documented REST endpoints | Respect per-record licences; cite datasets/download DOIs for substantial use; do not scrape gbif.org |
| iNaturalist | Taxon ID 56133 and research-grade field observations/photos | Possible via API with conservative rate/caching policy | Observation and photo licences are separate; only ingest explicitly compatible photo licences and preserve attribution |
| Wikimedia Commons | Reusable visual references and machine-readable licence metadata | Recommended through MediaWiki Action API `imageinfo/extmetadata` | Verify every file page; preserve photographer, licence, source URL and modifications |

API documentation and terms reviewed: [Trefle docs](https://docs.trefle.io/), [Trefle terms](https://trefle.io/terms), [GBIF API](https://techdocs.gbif.org/en/openapi/), [GBIF data-user agreement](https://www.gbif.org/terms/data-user), [iNaturalist API practices](https://www.inaturalist.org/pages/api%2Brecommended%2Bpractices), [iNaturalist media licensing](https://inaturalist.freshdesk.com/en/support/solutions/articles/151000169918-can-i-use-the-photos-and-sounds-that-are-posted-on-inaturalist-), and [Commons machine-readable data](https://commons.wikimedia.org/wiki/Help:Machine-readable_data).

No Trefle call was made because no token was assumed. GBIF and iNaturalist are catalogued as future discovery/corroboration services, not substituted for the botanical descriptions above.
