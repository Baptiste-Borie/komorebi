import {
  assertBotanicalSpeciesProfile,
  documented,
  unknown,
  type BotanicalSpeciesProfile,
} from '../schemas/species';

export const quercusRoburBotanicalProfile = {
  schemaVersion: 1,
  id: 'quercus-robur',
  reviewedOn: '2026-11-09',
  targetContext: 'Mature, open-grown European specimen with a broad, spreading crown; excludes fastigiate cultivars and pollards.',
  taxonomy: {
    acceptedScientificName: documented('Quercus robur L.', ['kew-powo']),
    family: documented('Fagaceae', ['floraweb', 'tso', 'rhs']),
    commonNames: documented(['English oak', 'common oak', 'pedunculate oak', 'chêne pédonculé'], ['rhs', 'tso']),
    nativeRange: documented('Europe east to Iran; temperate biome.', ['kew-powo']),
  },
  morphology: {
    growthHabit: documented('Large, long-lived deciduous tree with a spreading-branched habit.', ['rhs', 'tso']),
    matureHeightMetres: documented({ min: 20, max: 40 }, ['rhs'], 'FloraWeb records an exceptional maximum of 50 m; this profile uses the RHS typical mature range.'),
    matureSpreadMetres: documented('Open-grown crowns can be wider than the tree is high; no defensible universal numeric range was found in the core sources.', ['tso']),
    overallSilhouette: documented('Broad, spreading, rugged crown; in open ground the crown may be wider than the total tree height.', ['tso', 'rhs']),
    crownArchitecture: documented('A broad head carried by strong, rugged major branches; open-grown form differs materially from crowded woodland form.', ['tso', 'rhs']),
    trunkMorphology: documented('The trunk commonly divides only a few metres above ground into strong, gnarled, twisting limbs.', ['floraweb']),
    rootFlare: unknown('The reviewed botanical descriptions do not quantify or consistently describe root-flare form. Use photographs only as visual evidence, not as a species measurement.'),
    branchingStructure: documented('Major limbs are strong, spreading, gnarled and curved rather than a regular whorled system.', ['floraweb', 'tso']),
    bark: documented('Mature bark is deeply fissured; photographic and descriptive sources show predominantly longitudinal ridges and grooves.', ['floraweb', 'ucc']),
    leaves: documented('Leaves are 5–15 cm long and 3–10 cm wide, glabrous at maturity, pinnately lobed with usually 5–6 rounded lobes and a 2–7 mm petiole.', ['floraweb']),
    leafArrangement: documented('Leaves are alternate on the shoot.', ['ucc']),
    foliageDistribution: unknown('No reviewed core source quantified within-crown foliage distribution. Twig-end clustering seen in some horticultural descriptions is not encoded as a botanical fact here.'),
  },
  phenology: {
    foliage: documented('Deciduous; dark-green foliage turns reddish-brown in autumn.', ['rhs']),
    flowering: documented('Yellow-green catkins appear in spring; FloraWeb records May flowering in Germany.', ['rhs', 'floraweb']),
    fruiting: documented('Acorns ripen from green to brown, approximately 2–2.5 cm long, and are borne on a conspicuous stalk (peduncle).', ['rhs', 'tso']),
  },
  environment: {
    light: documented('Full sun to partial shade.', ['rhs']),
    soilAndMoisture: documented('Grows across chalk, clay, loam and sand in deep, fertile, moist but well-drained to well-drained soils; lime tolerant and able to occur on periodically wet sites.', ['rhs', 'floraweb']),
    architectureInfluences: documented('Open-grown trees form broad crowns, while trees in close stands grow taller; crown proportions must therefore be conditioned on competition and site context.', ['tso']),
  },
  sources: [
    {
      id: 'kew-powo', title: 'Quercus robur L.', organisation: 'Royal Botanic Gardens, Kew — Plants of the World Online',
      url: 'https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:304293-2', accessedOn: '2026-11-09', kind: 'botanical-database',
      use: 'Accepted name, status and native range.', automation: 'possible-with-care',
      licenseNotes: 'Use links and short derived facts with attribution; do not assume page imagery or text is freely redistributable.',
    },
    {
      id: 'rhs', title: 'Quercus robur — common oak', organisation: 'Royal Horticultural Society',
      url: 'https://www.rhs.org.uk/plants/14294/quercus-robur/details', accessedOn: '2026-11-09', kind: 'horticultural',
      use: 'Habit, dimensions, phenology and cultivation context.', automation: 'manual-only',
      licenseNotes: 'Reference and paraphrase only. No undocumented scraping or image redistribution.',
    },
    {
      id: 'floraweb', title: 'Quercus robur L. (Stiel-Eiche)', organisation: 'Bundesamt für Naturschutz — FloraWeb',
      url: 'https://www.floraweb.de/php/artenhome.php?suchnr=4685', accessedOn: '2026-11-09', kind: 'flora',
      use: 'Diagnostic morphology, trunk division, bark, leaves, habitat and flowering month.', automation: 'manual-only',
      licenseNotes: 'Reference and paraphrase with provenance; verify reuse terms before bulk acquisition.',
    },
    {
      id: 'tso', title: 'Quercus robur L.', organisation: 'International Dendrology Society — Trees and Shrubs Online',
      url: 'https://www.treesandshrubsonline.org/articles/quercus/quercus-robur/', accessedOn: '2026-11-09', kind: 'dendrology',
      use: 'Open-grown architecture, leaves, fruit and comparison with crowded growth.', automation: 'manual-only',
      licenseNotes: 'Article and embedded photographs have separate rights; cite and link, do not copy wholesale.',
    },
    {
      id: 'ucc', title: 'Quercus robur', organisation: 'University College Cork — Tree Explorers',
      url: 'https://www.ucc.ie/en/tree-explorers/trees/a-z/quercusrobur/', accessedOn: '2026-11-09', kind: 'horticultural',
      use: 'Corroboration for bark, leaf arrangement and seasonal characters.', automation: 'manual-only',
      licenseNotes: 'Reference and paraphrase only unless reuse permission is established.',
    },
  ],
} satisfies BotanicalSpeciesProfile;

assertBotanicalSpeciesProfile(quercusRoburBotanicalProfile);
