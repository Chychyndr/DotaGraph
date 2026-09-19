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
