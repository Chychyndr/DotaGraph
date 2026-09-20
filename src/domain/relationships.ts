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
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[’']/g, "")
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchHeroes(heroes: Hero[], query: string): Hero[] {
  const normalized = normalizeSearch(query);
  if (!normalized) return [];

  return heroes
    .map((hero) => {
      const name = normalizeSearch(hero.name);
      const slug = normalizeSearch(hero.slug);
      const aliases = hero.aliases.map(normalizeSearch);
      const exactName = name === normalized;
      const exactAlias = aliases.includes(normalized);
      const nameStarts = name.startsWith(normalized);
      const aliasStarts = aliases.some((value) => value.startsWith(normalized));
      const slugStarts = slug.startsWith(normalized);
      const nameContains = name.includes(normalized);
      const aliasContains = aliases.some((value) => value.includes(normalized));
      const slugContains = slug.includes(normalized);
      const score = exactName
        ? 0
        : exactAlias
          ? 1
          : nameStarts
            ? 2
            : aliasStarts
              ? 3
              : slugStarts
                ? 4
                : nameContains
                  ? 5
                  : aliasContains
                    ? 6
                    : slugContains
                      ? 7
                      : 99;
      return { hero, score };
    })
    .filter(({ score }) => score < 99)
    .sort((a, b) => a.score - b.score || a.hero.name.localeCompare(b.hero.name))
    .slice(0, 8)
    .map(({ hero }) => hero);
}

export const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export const formatSample = (value: number) => new Intl.NumberFormat("en-US").format(value);
