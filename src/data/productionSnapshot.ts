import type {
  MatchupEvidenceObservation,
  MatchupRelationship,
  ScopeConfig,
  StatisticalProvider
} from "../domain/types";
import { buildHeroes } from "./heroes";
import type { DatasetBundle } from "./dataset";

const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

type ConversionResult =
  | { ok: true; data: DatasetBundle }
  | { ok: false; issues: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const timestampIsValid = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

export function buildDatasetFromProductionSnapshot(
  value: unknown,
  now = Date.now()
): ConversionResult {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: ["Production snapshot must be an object."] };
  }

  if (value.schemaVersion !== 2) {
    issues.push("Production snapshot schemaVersion must be 2.");
  }
  if (value.kind !== "current-production-matchups") {
    issues.push("Production snapshot kind is unsupported.");
  }
  if (typeof value.patch !== "string" || !value.patch.trim()) {
    issues.push("Production snapshot patch is missing.");
  }
  if (!timestampIsValid(value.generatedAt)) {
    issues.push("Production snapshot generatedAt is invalid.");
  }

  const scopeValue = value.scope;
  if (!isRecord(scopeValue)) {
    issues.push("Production snapshot scope is missing.");
  }

  const provenance = value.provenance;
  if (!isRecord(provenance)) {
    issues.push("Production snapshot provenance is missing.");
  }

  const positionsValue = value.positions;
  if (!isRecord(positionsValue)) {
    issues.push("Production snapshot positions are missing.");
  }

  const heroStatsValue = value.heroStats;
  if (!isRecord(heroStatsValue)) {
    issues.push("Production snapshot heroStats are missing.");
  }

  if (!Array.isArray(value.relationships)) {
    issues.push("Production snapshot relationships must be an array.");
  }

  if (
    issues.length > 0 ||
    !isRecord(scopeValue) ||
    !isRecord(provenance) ||
    !isRecord(positionsValue) ||
    !isRecord(heroStatsValue) ||
    !Array.isArray(value.relationships) ||
    typeof value.patch !== "string" ||
    !timestampIsValid(value.generatedAt)
  ) {
    return { ok: false, issues };
  }

  if (scopeValue.rankScope !== "ancient_plus") {
    issues.push("Production snapshot rankScope is unsupported.");
  }
  if (typeof scopeValue.rankLabel !== "string" || !scopeValue.rankLabel.trim()) {
    issues.push("Production snapshot rankLabel is missing.");
  }
  if (
    !Number.isInteger(scopeValue.minimumSample) ||
    (scopeValue.minimumSample as number) < 0
  ) {
    issues.push("Production snapshot minimumSample is invalid.");
  }
  if (
    !Number.isInteger(scopeValue.maxVisiblePerDirection) ||
    (scopeValue.maxVisiblePerDirection as number) < 0 ||
    (scopeValue.maxVisiblePerDirection as number) > 5
  ) {
    issues.push("Production snapshot maxVisiblePerDirection is invalid.");
  }
  if (!timestampIsValid(scopeValue.observationWindowStart)) {
    issues.push("Production snapshot observationWindowStart is invalid.");
  }
  if (!timestampIsValid(scopeValue.observationWindowEndExclusive)) {
    issues.push("Production snapshot observationWindowEndExclusive is invalid.");
  }
  if (
    typeof provenance.headlineSource !== "string" ||
    !provenance.headlineSource.trim()
  ) {
    issues.push("Production snapshot headlineSource is missing.");
  }
  if (
    provenance.sourceUrl !== undefined &&
    (typeof provenance.sourceUrl !== "string" ||
      !provenance.sourceUrl.trim() ||
      (() => {
        try {
          new URL(provenance.sourceUrl);
          return false;
        } catch {
          return true;
        }
      })())
  ) {
    issues.push("Production snapshot provenance sourceUrl is invalid.");
  }
  if (
    provenance.endpoint !== undefined &&
    (typeof provenance.endpoint !== "string" || !provenance.endpoint.trim())
  ) {
    issues.push("Production snapshot provenance endpoint is invalid.");
  }
  if (
    provenance.queryMode !== undefined &&
    (typeof provenance.queryMode !== "string" || !provenance.queryMode.trim())
  ) {
    issues.push("Production snapshot provenance queryMode is invalid.");
  }
  if (
    provenance.secondarySources !== undefined &&
    (!Array.isArray(provenance.secondarySources) ||
      provenance.secondarySources.some(
        (source) => typeof source !== "string" || !source.trim()
      ))
  ) {
    issues.push("Production snapshot provenance secondarySources are invalid.");
  }

  const positions: Record<string, { x: number; y: number }> = {};
  for (const [slug, point] of Object.entries(positionsValue)) {
    if (!isRecord(point) || !isFiniteNumber(point.x) || !isFiniteNumber(point.y)) {
      issues.push(`Position for "${slug}" is malformed.`);
      continue;
    }
    positions[slug] = { x: point.x, y: point.y };
  }

  const heroStats: Record<
    string,
    { overallWinRate: number; pairObservationGames: number; matchCount: number } | null
  > = {};

  for (const [slug, stat] of Object.entries(heroStatsValue)) {
    if (stat === null) {
      heroStats[slug] = null;
      continue;
    }
    if (
      !isRecord(stat) ||
      !isFiniteNumber(stat.overallWinRate) ||
      stat.overallWinRate < 0 ||
      stat.overallWinRate > 1 ||
      !Number.isInteger(stat.pairObservationGames) ||
      (stat.pairObservationGames as number) < 0 ||
      !Number.isInteger(stat.matchCount) ||
      (stat.matchCount as number) < 0
    ) {
      issues.push(`Hero stats for "${slug}" are malformed.`);
      continue;
    }
    heroStats[slug] = {
      overallWinRate: stat.overallWinRate,
      pairObservationGames: stat.pairObservationGames as number,
      matchCount: stat.matchCount as number
    };
  }

  let heroes;
  try {
    heroes = buildHeroes({ positions, heroStats });
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "Hero build failed.");
    return { ok: false, issues };
  }

  const heroIdBySlug = new Map(heroes.map((hero) => [hero.slug, hero.id]));
  const scope: ScopeConfig = {
    patch: value.patch,
    rankScope: "ancient_plus",
    rankLabel: scopeValue.rankLabel as string,
    minimumSample: scopeValue.minimumSample as number,
    maxVisiblePerDirection: scopeValue.maxVisiblePerDirection as number
  };

  const evidenceObservations: MatchupEvidenceObservation[] = [];
  const evidenceValue = value.evidenceObservations;
  if (evidenceValue !== undefined && !Array.isArray(evidenceValue)) {
    issues.push("Production snapshot evidenceObservations must be an array.");
  }

  if (Array.isArray(evidenceValue)) {
    const allowedProviders = new Set<StatisticalProvider>([
      "OpenDota",
      "STRATZ",
      "DOTABUFF",
      "Dota2ProTracker"
    ]);

    for (const [index, raw] of evidenceValue.entries()) {
      if (!isRecord(raw)) {
        issues.push(`Production evidence observation at index ${index} is malformed.`);
        continue;
      }

      const sourceHeroId =
        typeof raw.sourceSlug === "string"
          ? heroIdBySlug.get(raw.sourceSlug)
          : undefined;
      const targetHeroId =
        typeof raw.targetSlug === "string"
          ? heroIdBySlug.get(raw.targetSlug)
          : undefined;
      const evidenceScope = raw.scope;
      const evidenceProvenance = raw.provenance;
      const provider = raw.provider;

      if (!sourceHeroId || !targetHeroId || sourceHeroId === targetHeroId) {
        issues.push(
          `Production evidence observation at index ${index} references an invalid hero pair.`
        );
        continue;
      }
      if (
        typeof provider !== "string" ||
        !allowedProviders.has(provider as StatisticalProvider)
      ) {
        issues.push(
          `Production evidence observation at index ${index} has an unsupported provider.`
        );
        continue;
      }
      if (
        typeof raw.id !== "string" ||
        !raw.id.trim() ||
        !isFiniteNumber(raw.sourceWinRate) ||
        raw.sourceWinRate < 0 ||
        raw.sourceWinRate > 1 ||
        (raw.sampleSize !== undefined &&
          (!Number.isInteger(raw.sampleSize) ||
            typeof raw.sampleSize !== "number" ||
            raw.sampleSize < 0)) ||
        !isRecord(evidenceScope) ||
        typeof evidenceScope.patch !== "string" ||
        !evidenceScope.patch.trim() ||
        typeof evidenceScope.rankScope !== "string" ||
        !evidenceScope.rankScope.trim() ||
        typeof evidenceScope.matchPopulation !== "string" ||
        !evidenceScope.matchPopulation.trim() ||
        !timestampIsValid(evidenceScope.observationWindowStart) ||
        !timestampIsValid(evidenceScope.observationWindowEndExclusive) ||
        Date.parse(evidenceScope.observationWindowEndExclusive) <=
          Date.parse(evidenceScope.observationWindowStart) ||
        !isRecord(evidenceProvenance) ||
        typeof evidenceProvenance.sourceUrl !== "string" ||
        !evidenceProvenance.sourceUrl.trim() ||
        (() => {
          try {
            new URL(evidenceProvenance.sourceUrl);
            return false;
          } catch {
            return true;
          }
        })() ||
        typeof evidenceProvenance.queryScope !== "string" ||
        !evidenceProvenance.queryScope.trim() ||
        !timestampIsValid(evidenceProvenance.collectedAt)
      ) {
        issues.push(
          `Production evidence observation at index ${index} is invalid.`
        );
        continue;
      }

      evidenceObservations.push({
        id: raw.id,
        provider: provider as StatisticalProvider,
        sourceHeroId,
        targetHeroId,
        sourceWinRate: raw.sourceWinRate,
        ...(typeof raw.sampleSize === "number"
          ? { sampleSize: raw.sampleSize }
          : {}),
        scope: {
          patch: evidenceScope.patch,
          rankScope: evidenceScope.rankScope,
          matchPopulation: evidenceScope.matchPopulation,
          observationWindowStart: evidenceScope.observationWindowStart,
          observationWindowEndExclusive:
            evidenceScope.observationWindowEndExclusive
        },
        provenance: {
          sourceUrl: evidenceProvenance.sourceUrl,
          queryScope: evidenceProvenance.queryScope,
          collectedAt: evidenceProvenance.collectedAt
        }
      });
    }
  }

  const relationships: MatchupRelationship[] = [];
  for (const [index, raw] of value.relationships.entries()) {
    if (!isRecord(raw)) {
      issues.push(`Production relationship at index ${index} is malformed.`);
      continue;
    }

    const sourceSlug = raw.sourceSlug;
    const targetSlug = raw.targetSlug;
    const sourceHeroId =
      typeof sourceSlug === "string" ? heroIdBySlug.get(sourceSlug) : undefined;
    const targetHeroId =
      typeof targetSlug === "string" ? heroIdBySlug.get(targetSlug) : undefined;

    if (!sourceHeroId || !targetHeroId) {
      issues.push(`Production relationship at index ${index} references an unknown hero.`);
      continue;
    }

    if (
      !isFiniteNumber(raw.sourceWinRate) ||
      raw.sourceWinRate < 0 ||
      raw.sourceWinRate > 1 ||
      !Number.isInteger(raw.sampleSize) ||
      (raw.sampleSize as number) < scope.minimumSample ||
      !isFiniteNumber(raw.rankingScore) ||
      raw.rankingScore <= 0 ||
      !isFiniteNumber(raw.baselineAdjustedDelta) ||
      raw.baselineAdjustedDelta <= 0 ||
      !isFiniteNumber(raw.expectedWinRate) ||
      raw.expectedWinRate < 0 ||
      raw.expectedWinRate > 1 ||
      !isFiniteNumber(raw.standardError) ||
      raw.standardError < 0 ||
      typeof raw.source !== "string" ||
      !raw.source.trim()
    ) {
      issues.push(`Production relationship at index ${index} has invalid statistics.`);
      continue;
    }

    relationships.push({
      id: `${sourceHeroId}--${targetHeroId}`,
      sourceHeroId,
      targetHeroId,
      sourceWinRate: raw.sourceWinRate,
      sampleSize: raw.sampleSize as number,
      patch: value.patch,
      rankScope: "ancient_plus",
      sourceKind: "generated",
      rankingScore: raw.rankingScore,
      baselineAdjustedDelta: raw.baselineAdjustedDelta,
      expectedWinRate: raw.expectedWinRate,
      standardError: raw.standardError,
      provenanceSource: raw.source,
      observationWindowStart: scopeValue.observationWindowStart as string,
      observationWindowEndExclusive: scopeValue.observationWindowEndExclusive as string
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const generatedAtMs = Date.parse(value.generatedAt);
  const ageMs = Math.max(0, now - generatedAtMs);
  const stale = ageMs > STALE_AFTER_MS;

  return {
    ok: true,
    data: {
      heroes,
      relationships,
      evidenceObservations,
      scope,
      metadata: {
        schemaVersion: 2,
        generatedAt: value.generatedAt,
        source: provenance.headlineSource as string,
        provenance: {
          headlineSource: provenance.headlineSource as string,
          ...(typeof provenance.sourceUrl === "string"
            ? { sourceUrl: provenance.sourceUrl }
            : {}),
          ...(typeof provenance.endpoint === "string"
            ? { endpoint: provenance.endpoint }
            : {}),
          ...(typeof provenance.queryMode === "string"
            ? { queryMode: provenance.queryMode }
            : {}),
          ...(Array.isArray(provenance.secondarySources)
            ? {
                secondarySources: provenance.secondarySources.filter(
                  (source): source is string => typeof source === "string"
                )
              }
            : {})
        },
        observationWindowStart: scopeValue.observationWindowStart as string,
        observationWindowEndExclusive:
          scopeValue.observationWindowEndExclusive as string,
        freshness: stale
          ? {
              status: "stale",
              reason: `Matchup snapshot is ${Math.floor(
                ageMs / (60 * 60 * 1000)
              )} hours old.`
            }
          : { status: "current" }
      }
    }
  };
}
