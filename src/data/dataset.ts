import type {
  Hero,
  MatchupEvidenceObservation,
  MatchupRelationship,
  ScopeConfig
} from "../domain/types";

export interface DatasetProvenance {
  headlineSource: string;
  sourceUrl?: string;
  endpoint?: string;
  queryMode?: string;
  secondarySources?: string[];
}

export interface DatasetMetadata {
  schemaVersion: 1 | 2;
  generatedAt: string;
  source?: string;
  provenance?: DatasetProvenance;
  observationWindowStart?: string;
  observationWindowEndExclusive?: string;
  freshness: {
    status: "current" | "stale";
    reason?: string;
  };
}

export interface DatasetBundle {
  heroes: Hero[];
  relationships: MatchupRelationship[];
  evidenceObservations?: MatchupEvidenceObservation[];
  scope: ScopeConfig;
  metadata: DatasetMetadata;
}

export type DatasetValidationResult =
  | { ok: true; data: DatasetBundle }
  | { ok: false; issues: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const STATISTICAL_PROVIDERS = new Set([
  "OpenDota",
  "STRATZ",
  "DOTABUFF",
  "Dota2ProTracker"
]);

const isValidTimestamp = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

const isValidUrl = (value: unknown): value is string => {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export function validateDataset(value: unknown): DatasetValidationResult {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: ["Dataset must be an object."] };
  }

  const heroes = value.heroes;
  const relationships = value.relationships;
  const scope = value.scope;
  const metadata = value.metadata;

  if (!Array.isArray(heroes) || heroes.length === 0) {
    issues.push("Dataset must contain at least one hero.");
  }

  if (!Array.isArray(relationships)) {
    issues.push("Dataset relationships must be an array.");
  }

  if (!isRecord(scope)) {
    issues.push("Dataset scope is missing or malformed.");
  } else {
    if (typeof scope.patch !== "string" || !scope.patch.trim()) {
      issues.push("Scope patch must be a non-empty string.");
    }
    if (scope.rankScope !== "ancient_plus") {
      issues.push("Scope rankScope is unsupported.");
    }
    if (typeof scope.rankLabel !== "string" || !scope.rankLabel.trim()) {
      issues.push("Scope rankLabel must be a non-empty string.");
    }
    if (!Number.isInteger(scope.minimumSample) || (scope.minimumSample as number) < 0) {
      issues.push("Scope minimumSample must be a non-negative integer.");
    }
    if (
      !Number.isInteger(scope.maxVisiblePerDirection) ||
      (scope.maxVisiblePerDirection as number) < 0 ||
      (scope.maxVisiblePerDirection as number) > 5
    ) {
      issues.push("Scope maxVisiblePerDirection must be an integer from 0 to 5.");
    }
  }

  if (!isRecord(metadata)) {
    issues.push("Dataset metadata is missing or malformed.");
  } else {
    if (metadata.schemaVersion !== 1 && metadata.schemaVersion !== 2) {
      issues.push("Dataset schemaVersion is unsupported.");
    }
    if (
      typeof metadata.generatedAt !== "string" ||
      Number.isNaN(Date.parse(metadata.generatedAt))
    ) {
      issues.push("Dataset generatedAt must be a valid timestamp.");
    }

    if (metadata.schemaVersion === 2) {
      if (typeof metadata.source !== "string" || !metadata.source.trim()) {
        issues.push("Schema v2 datasets must include a source.");
      }

      const provenance = metadata.provenance;
      if (!isRecord(provenance)) {
        issues.push("Schema v2 datasets must include provenance details.");
      } else {
        if (
          typeof provenance.headlineSource !== "string" ||
          !provenance.headlineSource.trim()
        ) {
          issues.push("Dataset provenance headlineSource must be a non-empty string.");
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
          issues.push("Dataset provenance sourceUrl must be a valid URL.");
        }
        for (const key of ["endpoint", "queryMode"] as const) {
          const entry = provenance[key];
          if (entry !== undefined && (typeof entry !== "string" || !entry.trim())) {
            issues.push(`Dataset provenance ${key} must be a non-empty string.`);
          }
        }
        if (
          provenance.secondarySources !== undefined &&
          (!Array.isArray(provenance.secondarySources) ||
            provenance.secondarySources.some(
              (source) => typeof source !== "string" || !source.trim()
            ))
        ) {
          issues.push("Dataset provenance secondarySources must contain non-empty strings.");
        }
      }

      if (
        typeof metadata.observationWindowStart !== "string" ||
        Number.isNaN(Date.parse(metadata.observationWindowStart))
      ) {
        issues.push("Schema v2 datasets must include a valid observationWindowStart.");
      }
      if (
        typeof metadata.observationWindowEndExclusive !== "string" ||
        Number.isNaN(Date.parse(metadata.observationWindowEndExclusive))
      ) {
        issues.push("Schema v2 datasets must include a valid observationWindowEndExclusive.");
      }
    }

    const freshness = metadata.freshness;
    if (!isRecord(freshness) || (freshness.status !== "current" && freshness.status !== "stale")) {
      issues.push("Dataset freshness status must be current or stale.");
    } else if (
      freshness.status === "stale" &&
      (typeof freshness.reason !== "string" || !freshness.reason.trim())
    ) {
      issues.push("Stale datasets must include a reason.");
    }
  }

  const heroIds = new Set<string>();
  if (Array.isArray(heroes)) {
    heroes.forEach((hero, index) => {
      if (!isRecord(hero)) {
        issues.push(`Hero at index ${index} is malformed.`);
        return;
      }

      const prefix = `Hero at index ${index}`;
      if (typeof hero.id !== "string" || !hero.id.trim()) {
        issues.push(`${prefix} has an invalid id.`);
      } else if (heroIds.has(hero.id)) {
        issues.push(`Hero id "${hero.id}" is duplicated.`);
      } else {
        heroIds.add(hero.id);
      }

      if (typeof hero.slug !== "string" || !hero.slug.trim()) {
        issues.push(`${prefix} has an invalid slug.`);
      }
      if (typeof hero.name !== "string" || !hero.name.trim()) {
        issues.push(`${prefix} has an invalid name.`);
      }
      if (!Array.isArray(hero.aliases) || hero.aliases.some((alias) => typeof alias !== "string")) {
        issues.push(`${prefix} has invalid aliases.`);
      }
      if (!Number.isInteger(hero.spriteIndex) || (hero.spriteIndex as number) < 0) {
        issues.push(`${prefix} has an invalid spriteIndex.`);
      }
      if (!isFiniteNumber(hero.x) || !isFiniteNumber(hero.y)) {
        issues.push(`${prefix} has invalid graph coordinates.`);
      }
    });
  }

  const evidenceObservations = value.evidenceObservations;
  if (evidenceObservations !== undefined && !Array.isArray(evidenceObservations)) {
    issues.push("Dataset evidenceObservations must be an array.");
  }

  const evidenceIds = new Set<string>();
  if (Array.isArray(evidenceObservations)) {
    evidenceObservations.forEach((observation, index) => {
      if (!isRecord(observation)) {
        issues.push(`Evidence observation at index ${index} is malformed.`);
        return;
      }

      const prefix = `Evidence observation at index ${index}`;
      if (typeof observation.id !== "string" || !observation.id.trim()) {
        issues.push(`${prefix} has an invalid id.`);
      } else if (evidenceIds.has(observation.id)) {
        issues.push(`Evidence observation id "${observation.id}" is duplicated.`);
      } else {
        evidenceIds.add(observation.id);
      }

      if (
        typeof observation.provider !== "string" ||
        !STATISTICAL_PROVIDERS.has(observation.provider)
      ) {
        issues.push(`${prefix} has an unsupported provider.`);
      }
      if (
        typeof observation.sourceHeroId !== "string" ||
        !heroIds.has(observation.sourceHeroId)
      ) {
        issues.push(`${prefix} references an unknown source hero.`);
      }
      if (
        typeof observation.targetHeroId !== "string" ||
        !heroIds.has(observation.targetHeroId)
      ) {
        issues.push(`${prefix} references an unknown target hero.`);
      }
      if (
        typeof observation.sourceHeroId === "string" &&
        observation.sourceHeroId === observation.targetHeroId
      ) {
        issues.push(`${prefix} cannot point a hero to itself.`);
      }
      if (
        !isFiniteNumber(observation.sourceWinRate) ||
        observation.sourceWinRate < 0 ||
        observation.sourceWinRate > 1
      ) {
        issues.push(`${prefix} has an invalid sourceWinRate.`);
      }
      if (
        observation.sampleSize !== undefined &&
        (!Number.isInteger(observation.sampleSize) || observation.sampleSize < 0)
      ) {
        issues.push(`${prefix} has an invalid sampleSize.`);
      }

      const evidenceScope = observation.scope;
      if (!isRecord(evidenceScope)) {
        issues.push(`${prefix} has a malformed scope.`);
      } else {
        for (const key of ["patch", "rankScope", "matchPopulation"] as const) {
          const entry = evidenceScope[key];
          if (typeof entry !== "string" || !entry.trim()) {
            issues.push(`${prefix} scope ${key} must be a non-empty string.`);
          }
        }

        const start = evidenceScope.observationWindowStart;
        const end = evidenceScope.observationWindowEndExclusive;
        if (!isValidTimestamp(start) || !isValidTimestamp(end)) {
          issues.push(`${prefix} has an invalid observation window.`);
        } else if (Date.parse(end) <= Date.parse(start)) {
          issues.push(`${prefix} observation window must have positive duration.`);
        }
      }

      const evidenceProvenance = observation.provenance;
      if (!isRecord(evidenceProvenance)) {
        issues.push(`${prefix} has malformed provenance.`);
      } else {
        if (!isValidUrl(evidenceProvenance.sourceUrl)) {
          issues.push(`${prefix} provenance sourceUrl must be a valid URL.`);
        }
        if (
          typeof evidenceProvenance.queryScope !== "string" ||
          !evidenceProvenance.queryScope.trim()
        ) {
          issues.push(`${prefix} provenance queryScope must be a non-empty string.`);
        }
        if (!isValidTimestamp(evidenceProvenance.collectedAt)) {
          issues.push(`${prefix} provenance collectedAt must be a valid timestamp.`);
        }
      }
    });
  }

  const relationshipIds = new Set<string>();
  if (Array.isArray(relationships)) {
    relationships.forEach((relationship, index) => {
      if (!isRecord(relationship)) {
        issues.push(`Relationship at index ${index} is malformed.`);
        return;
      }

      const prefix = `Relationship at index ${index}`;
      if (typeof relationship.id !== "string" || !relationship.id.trim()) {
        issues.push(`${prefix} has an invalid id.`);
      } else if (relationshipIds.has(relationship.id)) {
        issues.push(`Relationship id "${relationship.id}" is duplicated.`);
      } else {
        relationshipIds.add(relationship.id);
      }

      if (typeof relationship.sourceHeroId !== "string" || !heroIds.has(relationship.sourceHeroId)) {
        issues.push(`${prefix} references an unknown source hero.`);
      }
      if (typeof relationship.targetHeroId !== "string" || !heroIds.has(relationship.targetHeroId)) {
        issues.push(`${prefix} references an unknown target hero.`);
      }
      if (
        typeof relationship.sourceHeroId === "string" &&
        relationship.sourceHeroId === relationship.targetHeroId
      ) {
        issues.push(`${prefix} cannot point a hero to itself.`);
      }
      if (
        !isFiniteNumber(relationship.sourceWinRate) ||
        relationship.sourceWinRate < 0 ||
        relationship.sourceWinRate > 1
      ) {
        issues.push(`${prefix} has an invalid sourceWinRate.`);
      }
      if (!Number.isInteger(relationship.sampleSize) || (relationship.sampleSize as number) < 0) {
        issues.push(`${prefix} has an invalid sampleSize.`);
      }
      if (isRecord(scope)) {
        if (relationship.patch !== scope.patch) {
          issues.push(`${prefix} patch does not match dataset scope.`);
        }
        if (relationship.rankScope !== scope.rankScope) {
          issues.push(`${prefix} rank scope does not match dataset scope.`);
        }
      }
      if (relationship.sourceKind !== "fixture" && relationship.sourceKind !== "generated") {
        issues.push(`${prefix} has an unsupported sourceKind.`);
      }

      if (relationship.sourceKind === "generated") {
        if (!isFiniteNumber(relationship.rankingScore) || relationship.rankingScore <= 0) {
          issues.push(`${prefix} must include a positive rankingScore.`);
        }
        if (
          !isFiniteNumber(relationship.baselineAdjustedDelta) ||
          relationship.baselineAdjustedDelta <= 0
        ) {
          issues.push(`${prefix} must include a positive baselineAdjustedDelta.`);
        }
        if (
          !isFiniteNumber(relationship.expectedWinRate) ||
          relationship.expectedWinRate < 0 ||
          relationship.expectedWinRate > 1
        ) {
          issues.push(`${prefix} has an invalid expectedWinRate.`);
        }
        if (!isFiniteNumber(relationship.standardError) || relationship.standardError < 0) {
          issues.push(`${prefix} has an invalid standardError.`);
        }
        if (
          typeof relationship.provenanceSource !== "string" ||
          !relationship.provenanceSource.trim()
        ) {
          issues.push(`${prefix} must include provenanceSource.`);
        }
      }
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, data: value as unknown as DatasetBundle };
}
