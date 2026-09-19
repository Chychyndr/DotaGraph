import type { MatchupRelationship } from "../domain/types";

const relationshipOrder = (a: MatchupRelationship, b: MatchupRelationship) =>
  (b.rankingScore ?? Number.NEGATIVE_INFINITY) -
    (a.rankingScore ?? Number.NEGATIVE_INFINITY) ||
  (b.baselineAdjustedDelta ?? Number.NEGATIVE_INFINITY) -
    (a.baselineAdjustedDelta ?? Number.NEGATIVE_INFINITY) ||
  b.sampleSize - a.sampleSize ||
  a.sourceHeroId.localeCompare(b.sourceHeroId) ||
  a.targetHeroId.localeCompare(b.targetHeroId);

export function selectOverviewBackbone(
  relationships: MatchupRelationship[]
): MatchupRelationship[] {
  const incident = new Map<string, MatchupRelationship[]>();

  for (const relationship of relationships) {
    for (const heroId of [relationship.sourceHeroId, relationship.targetHeroId]) {
      const bucket = incident.get(heroId);
      if (bucket) bucket.push(relationship);
      else incident.set(heroId, [relationship]);
    }
  }

  const selected = new Map<string, MatchupRelationship>();

  for (const heroId of [...incident.keys()].sort()) {
    const strongest = [...(incident.get(heroId) ?? [])].sort(relationshipOrder)[0];
    if (strongest) selected.set(strongest.id, strongest);
  }

  return [...selected.values()].sort(relationshipOrder);
}

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

export function mergeVisibleRelationships(
  ...groups: MatchupRelationship[][]
): MatchupRelationship[] {
  const merged = new Map<string, MatchupRelationship>();

  for (const relationship of groups.flat()) {
    merged.set(relationship.id, relationship);
  }

  return [...merged.values()].sort(relationshipOrder);
}
