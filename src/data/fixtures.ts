import type { MatchupRelationship, ScopeConfig } from "../domain/types";

export const scope: ScopeConfig = {
  patch: "7.41e",
  rankScope: "ancient_plus",
  rankLabel: "Ancient+",
  minimumSample: 500,
  maxVisiblePerDirection: 5
};

const fx = (
  sourceHeroId: string,
  targetHeroId: string,
  sourceWinRate: number,
  sampleSize: number,
  explanation = "Development fixture: explanation copy will be sourced and human-reviewed before production."
): MatchupRelationship => ({
  id: `${sourceHeroId}--${targetHeroId}`,
  sourceHeroId,
  targetHeroId,
  sourceWinRate,
  sampleSize,
  patch: scope.patch,
  rankScope: scope.rankScope,
  sourceKind: "fixture",
  explanation
});

export const fixtureRelationships: MatchupRelationship[] = [
  fx("shadow-demon","viper",0.572,18431),
  fx("templar-assassin","viper",0.558,22110),
  fx("bristleback","viper",0.549,25404),
  fx("lifestealer","viper",0.543,31822),
  fx("mars","viper",0.537,19412),
  fx("axe","viper",0.601,312),
  fx("viper","huskar",0.561,28810),
  fx("viper","chaos-knight",0.549,27105),
  fx("viper","spectre",0.542,23314),
  fx("viper","dragon-knight",0.536,30201),
  fx("viper","tidehunter",0.529,20512),
  fx("underlord","centaur",0.551,16672),
  fx("lifestealer","centaur",0.546,18114),
  fx("windranger","centaur",0.533,12992),
  fx("phantom-assassin","monkey-king",0.538,24101),
  fx("night-stalker","windranger",0.535,14022),
  fx("dragon-knight","templar-assassin",0.531,17118),
  fx("tidehunter","phantom-assassin",0.527,19801),
  fx("bristleback","spectre",0.526,21091),
  fx("chaos-knight","shadow-demon",0.524,15334),
  fx("monkey-king","lifestealer",0.523,20441),
  fx("mars","phantom-assassin",0.521,22618),
  fx("underlord","chaos-knight",0.519,18328),
  fx("axe","monkey-king",0.518,26102)
];
