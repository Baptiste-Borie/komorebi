export type ResearchVerification =
  | 'verified-authoritative'
  | 'corroborating-observation'
  | 'unverified-import'
  | 'missing'
  | 'conflict';

export interface ResearchProvenance {
  sourceId: 'gbif' | 'inaturalist' | 'wikimedia-commons' | 'trefle';
  sourceUrl: string;
  retrievedOn: string;
  verification: ResearchVerification;
  confidence: number | null;
  licenseNotes: string;
}

export interface ImportedFact<T = unknown> {
  path: string;
  value: T | null;
  provenance: ResearchProvenance;
  note?: string;
}

export interface ResearchImage {
  sourceId: 'inaturalist' | 'wikimedia-commons';
  sourcePage: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  photographer: string;
  license: string | null;
  licenseUrl: string | null;
  observationLicense: string | null;
  reusable: boolean;
  rejectionReason: string | null;
  subjects: readonly string[];
}

export interface ResearchSourceRun {
  sourceId: ResearchProvenance['sourceId'];
  status: 'complete' | 'skipped' | 'failed';
  requestCount: number;
  note: string;
}

export interface BotanicalResearchDossier {
  schemaVersion: 1;
  request: {
    inputName: string;
    slug: string;
    retrievedOn: string;
  };
  resolution: {
    status: 'resolved' | 'manual-review' | 'unresolved';
    acceptedScientificName: string | null;
    gbifTaxonKey: string | null;
    matchType: string | null;
    confidence: number | null;
    issues: readonly string[];
    alternatives: readonly { key: string; name: string; rank: string; status: string }[];
  };
  facts: readonly ImportedFact[];
  conflicts: readonly { path: string; values: readonly unknown[]; sourceIds: readonly string[] }[];
  missing: readonly string[];
  images: {
    reusable: readonly ResearchImage[];
    metadataOnly: readonly ResearchImage[];
    rejected: readonly ResearchImage[];
  };
  sourceRuns: readonly ResearchSourceRun[];
  artisticInterpretations: readonly never[];
  reviewNotes: readonly string[];
}
