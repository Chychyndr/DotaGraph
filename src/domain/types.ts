export type HeroId = string;

export interface Hero {
  id: HeroId;
  slug: string;
  name: string;
  aliases: string[];
  spriteIndex: number;
  x: number;
  y: number;
  overallWinRate?: number;
  sampleSize?: number;
}

export interface MatchupRelationship {
  id: string;
  sourceHeroId: HeroId;
  targetHeroId: HeroId;
  sourceWinRate: number;
  sampleSize: number;
  patch: string;
  rankScope: "ancient_plus";
  sourceKind: "fixture" | "generated";
  rankingScore?: number;
  baselineAdjustedDelta?: number;
  expectedWinRate?: number;
  standardError?: number;
  provenanceSource?: string;
  observationWindowStart?: string;
  observationWindowEndExclusive?: string;
  explanation?: string;
}

export interface ScopeConfig {
  patch: string;
  rankScope: "ancient_plus";
  rankLabel: string;
  minimumSample: number;
  maxVisiblePerDirection: number;
}

export interface SelectedRelations {
  incoming: MatchupRelationship[];
  outgoing: MatchupRelationship[];
}


export type StatisticalProvider =
  | "OpenDota"
  | "STRATZ"
  | "DOTABUFF"
  | "Dota2ProTracker";

export interface MatchupEvidenceScope {
  patch: string;
  rankScope: string;
  matchPopulation: string;
  observationWindowStart: string;
  observationWindowEndExclusive: string;
}

export interface MatchupEvidenceProvenance {
  sourceUrl: string;
  queryScope: string;
  collectedAt: string;
}

export interface MatchupEvidenceObservation {
  id: string;
  provider: StatisticalProvider;
  sourceHeroId: HeroId;
  targetHeroId: HeroId;
  sourceWinRate: number;
  sampleSize?: number;
  scope: MatchupEvidenceScope;
  provenance: MatchupEvidenceProvenance;
}

export type EvidenceExclusionReason =
  | "different_direction"
  | "different_patch"
  | "different_rank_scope"
  | "different_match_population"
  | "invalid_observation_window"
  | "misaligned_observation_window"
  | "unknown_sample_size"
  | "insufficient_sample"
  | "superseded_provider_observation";

export type CrossSourceDisagreementLevel =
  | "single_source"
  | "aligned"
  | "noticeable"
  | "large";

export interface ExcludedMatchupEvidence {
  observation: MatchupEvidenceObservation;
  reasons: EvidenceExclusionReason[];
}

export interface CrossSourceEvidenceSummary {
  referenceObservationId: string;
  includedObservations: MatchupEvidenceObservation[];
  excludedObservations: ExcludedMatchupEvidence[];
  disagreementLevel: CrossSourceDisagreementLevel;
  spreadPercentagePoints?: number;
  consensusWinRate?: number;
}
