import type { MatchupRelationship } from "../domain/types";

const relationshipOrder = (a: MatchupRelationship, b: MatchupRelationship) =>
  (b.rankingScore ?? Number.NEGATIVE_INFINITY) -
    (a.rankingScore ?? Number.NEGATIVE_INFINITY) ||
  (b.baselineAdjustedDelta ?? Number.NEGATIVE_INFINITY) -
    (a.baselineAdjustedDelta ?? Number.NEGATIVE_INFINITY) ||
  b.sampleSize - a.sampleSize ||
  a.sourceHeroId.localeCompare(b.sourceHeroId) ||
  a.targetHeroId.localeCompare(b.targetHeroId);

export function selectHoverRelationships(
  heroId: string,
  relationships: MatchupRelationship[],
  limit = 5
): MatchupRelationship[] {
  return relationships
    .filter(
      relationship =>
        relationship.sourceHeroId === heroId ||
        relationship.targetHeroId === heroId
    )
    .sort(relationshipOrder)
    .slice(0, limit);
}

