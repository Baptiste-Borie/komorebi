export type SourceKind = 'botanical-database' | 'flora' | 'horticultural' | 'dendrology' | 'api' | 'media-repository';

export interface BotanicalSource {
  id: string;
  title: string;
  organisation: string;
  url: string;
  accessedOn: string;
  kind: SourceKind;
  use: string;
  automation: 'recommended' | 'possible-with-care' | 'manual-only' | 'blocked-without-token';
  licenseNotes: string;
}

export type ClaimStatus = 'documented' | 'unknown';

export interface BotanicalClaim<T> {
  value: T | null;
  status: ClaimStatus;
  sourceIds: readonly string[];
  note?: string;
}

export interface BotanicalSpeciesProfile {
  schemaVersion: 1;
  id: string;
  reviewedOn: string;
  targetContext: string;
  taxonomy: {
    acceptedScientificName: BotanicalClaim<string>;
    family: BotanicalClaim<string>;
    commonNames: BotanicalClaim<readonly string[]>;
    nativeRange: BotanicalClaim<string>;
  };
  morphology: {
    growthHabit: BotanicalClaim<string>;
    matureHeightMetres: BotanicalClaim<{ min: number; max: number }>;
    matureSpreadMetres: BotanicalClaim<{ min: number; max: number } | string>;
    overallSilhouette: BotanicalClaim<string>;
    crownArchitecture: BotanicalClaim<string>;
    trunkMorphology: BotanicalClaim<string>;
    rootFlare: BotanicalClaim<string>;
    branchingStructure: BotanicalClaim<string>;
    bark: BotanicalClaim<string>;
    leaves: BotanicalClaim<string>;
    leafArrangement: BotanicalClaim<string>;
    foliageDistribution: BotanicalClaim<string>;
  };
  phenology: {
    foliage: BotanicalClaim<string>;
    flowering: BotanicalClaim<string>;
    fruiting: BotanicalClaim<string>;
  };
  environment: {
    light: BotanicalClaim<string>;
    soilAndMoisture: BotanicalClaim<string>;
    architectureInfluences: BotanicalClaim<string>;
  };
  sources: readonly BotanicalSource[];
}

export interface ArtisticRange {
  min: number;
  max: number;
}

export interface ProceduralParameter<T> {
  value: T;
  unit: 'ratio' | 'degrees' | 'normalised' | 'count' | 'categorical';
  interpretation: string;
  botanicalBasis: string;
  sourceClaimPaths: readonly string[];
}

export interface ProceduralSpeciesProfile {
  schemaVersion: 1;
  speciesId: string;
  status: 'artistic-interpretation';
  targetContext: string;
  warning: string;
  parameters: {
    crownAspectWidthToHeight: ProceduralParameter<ArtisticRange>;
    crownIrregularity: ProceduralParameter<ArtisticRange>;
    crownDensity: ProceduralParameter<ArtisticRange>;
    trunkClearHeightToTreeHeight: ProceduralParameter<ArtisticRange>;
    trunkBaseRadiusToDbhRadius: ProceduralParameter<ArtisticRange>;
    trunkTaper: ProceduralParameter<ArtisticRange>;
    primaryBranchCount: ProceduralParameter<ArtisticRange>;
    primaryBranchElevation: ProceduralParameter<ArtisticRange>;
    branchCurvature: ProceduralParameter<ArtisticRange>;
    branchAzimuthIrregularity: ProceduralParameter<ArtisticRange>;
    foliageClusterScale: ProceduralParameter<ArtisticRange>;
    foliagePeripheralBias: ProceduralParameter<ArtisticRange>;
    barkMarkOrientation: ProceduralParameter<ArtisticRange>;
    barkMarkAspect: ProceduralParameter<ArtisticRange>;
  };
}

export interface ReferenceImage {
  id: string;
  speciesId: string;
  subjects: readonly ('silhouette' | 'open-grown' | 'root-flare' | 'branching' | 'bark' | 'leaves')[];
  localPath: string | null;
  sourcePage: string;
  originalFile: string;
  photographer: string;
  license: string;
  licenseUrl: string | null;
  modifications: string;
  redistribution: 'bundled' | 'metadata-only';
}

export function documented<T>(value: T, sourceIds: readonly string[], note?: string): BotanicalClaim<T> {
  return { value, status: 'documented', sourceIds, ...(note ? { note } : {}) };
}

export function unknown<T>(note: string): BotanicalClaim<T> {
  return { value: null, status: 'unknown', sourceIds: [], note };
}

export function assertBotanicalSpeciesProfile(profile: BotanicalSpeciesProfile): void {
  const sourceIds = new Set(profile.sources.map((source) => source.id));
  const visit = (value: unknown, path: string): void => {
    if (!value || typeof value !== 'object') return;
    if ('status' in value && 'sourceIds' in value) {
      const claim = value as BotanicalClaim<unknown>;
      if (claim.status === 'documented' && (claim.value === null || claim.sourceIds.length === 0)) {
        throw new Error(`${profile.id}: documented claim ${path} needs a value and at least one source`);
      }
      for (const sourceId of claim.sourceIds) {
        if (!sourceIds.has(sourceId)) throw new Error(`${profile.id}: ${path} cites unknown source ${sourceId}`);
      }
      return;
    }
    for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`);
  };
  visit(profile, profile.id);
}
