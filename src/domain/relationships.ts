import type { Hero, MatchupRelationship, ScopeConfig, SelectedRelations } from "./types";

const stableSort = (a: MatchupRelationship, b: MatchupRelationship) =>
  (b.rankingScore ?? Number.NEGATIVE_INFINITY) -
    (a.rankingScore ?? Number.NEGATIVE_INFINITY) ||
  (b.baselineAdjustedDelta ?? Number.NEGATIVE_INFINITY) -
    (a.baselineAdjustedDelta ?? Number.NEGATIVE_INFINITY) ||
  b.sampleSize - a.sampleSize ||
  a.sourceHeroId.localeCompare(b.sourceHeroId) ||
  a.targetHeroId.localeCompare(b.targetHeroId);

export function selectRelations(
  selectedHeroId: string,
  relationships: MatchupRelationship[],
  scope: ScopeConfig
): SelectedRelations {
  const eligible = relationships.filter(
    (relationship) =>
      relationship.sampleSize >= scope.minimumSample &&
      relationship.patch === scope.patch &&
      relationship.rankScope === scope.rankScope
  );

  return {
    incoming: eligible
      .filter((relationship) => relationship.targetHeroId === selectedHeroId)
      .sort(stableSort)
      .slice(0, scope.maxVisiblePerDirection),
    outgoing: eligible
      .filter((relationship) => relationship.sourceHeroId === selectedHeroId)
      .sort(stableSort)
      .slice(0, scope.maxVisiblePerDirection)
  };
}

export function findRelationship(
  selectedHeroId: string,
  neighborHeroId: string,
  relationships: MatchupRelationship[],
  scope: ScopeConfig
): MatchupRelationship | undefined {
  const selected = selectRelations(selectedHeroId, relationships, scope);
  return [...selected.incoming, ...selected.outgoing].find(
    (relationship) =>
      (relationship.sourceHeroId === selectedHeroId &&
        relationship.targetHeroId === neighborHeroId) ||
      (relationship.sourceHeroId === neighborHeroId &&
        relationship.targetHeroId === selectedHeroId)
  );
}

export function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ");
}

export function searchHeroes(heroes: Hero[], query: string): Hero[] {
  const normalized = normalizeSearch(query);
  if (!normalized) return [];

  return heroes
    .map((hero) => {
      const haystacks = [hero.name, hero.slug, ...hero.aliases].map(normalizeSearch);
      const exactAlias = hero.aliases.map(normalizeSearch).includes(normalized);
      const exactName = normalizeSearch(hero.name) === normalized;
      const starts = haystacks.some((value) => value.startsWith(normalized));
      const contains = haystacks.some((value) => value.includes(normalized));
      const score = exactAlias ? 0 : exactName ? 1 : starts ? 2 : contains ? 3 : 99;
      return { hero, score };
    })
    .filter(({ score }) => score < 99)
    .sort((a, b) => a.score - b.score || a.hero.name.localeCompare(b.hero.name))
    .slice(0, 8)
    .map(({ hero }) => hero);
}

export const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export const formatSample = (value: number) => new Intl.NumberFormat("en-US").format(value);
