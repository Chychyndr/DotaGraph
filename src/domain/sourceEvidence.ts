import type {
  CrossSourceEvidenceSummary,
  EvidenceExclusionReason,
  MatchupEvidenceObservation
} from "./types";

export const DEFAULT_EVIDENCE_MINIMUM_SAMPLE = 500;
export const MIN_COMPATIBLE_WINDOW_OVERLAP_RATIO = 0.5;
export const MAX_COMPATIBLE_WINDOW_END_SKEW_MS = 36 * 60 * 60 * 1000;
export const NOTICEABLE_DISAGREEMENT_PP = 2;
export const LARGE_DISAGREEMENT_PP = 5;

interface EvidenceAggregationOptions {
  minimumSample?: number;
  minimumWindowOverlapRatio?: number;
  maximumWindowEndSkewMs?: number;
}

interface ParsedWindow {
  start: number;
  end: number;
}

const parseWindow = (
  observation: MatchupEvidenceObservation
): ParsedWindow | null => {
  const start = Date.parse(observation.scope.observationWindowStart);
  const end = Date.parse(observation.scope.observationWindowEndExclusive);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  return { start, end };
};

const windowOverlapRatio = (
  first: ParsedWindow,
  second: ParsedWindow
): number => {
  const overlap = Math.max(
    0,
    Math.min(first.end, second.end) - Math.max(first.start, second.start)
  );
  const shorterDuration = Math.min(
    first.end - first.start,
    second.end - second.start
  );

  return shorterDuration > 0 ? overlap / shorterDuration : 0;
};

const sourceScopeReasons = (
  reference: MatchupEvidenceObservation,
  candidate: MatchupEvidenceObservation,
  options: Required<EvidenceAggregationOptions>
): EvidenceExclusionReason[] => {
  const reasons: EvidenceExclusionReason[] = [];

  if (
    reference.sourceHeroId !== candidate.sourceHeroId ||
    reference.targetHeroId !== candidate.targetHeroId
  ) {
    reasons.push("different_direction");
  }
  if (reference.scope.patch !== candidate.scope.patch) {
    reasons.push("different_patch");
  }
  if (reference.scope.rankScope !== candidate.scope.rankScope) {
    reasons.push("different_rank_scope");
  }
  if (reference.scope.matchPopulation !== candidate.scope.matchPopulation) {
    reasons.push("different_match_population");
  }

  const referenceWindow = parseWindow(reference);
  const candidateWindow = parseWindow(candidate);

  if (!referenceWindow || !candidateWindow) {
    reasons.push("invalid_observation_window");
  } else {
    const overlapRatio = windowOverlapRatio(referenceWindow, candidateWindow);
    const endSkew = Math.abs(referenceWindow.end - candidateWindow.end);

    if (
      overlapRatio < options.minimumWindowOverlapRatio ||
      endSkew > options.maximumWindowEndSkewMs
    ) {
      reasons.push("misaligned_observation_window");
    }
  }

  return reasons;
};

const observationValueReasons = (
  observation: MatchupEvidenceObservation,
  minimumSample: number
): EvidenceExclusionReason[] => {
  const reasons: EvidenceExclusionReason[] = [];

  if (
    !Number.isFinite(observation.sourceWinRate) ||
    observation.sourceWinRate < 0 ||
    observation.sourceWinRate > 1
  ) {
    reasons.push("invalid_win_rate");
  }

  if (typeof observation.sampleSize !== "number") {
    return [...reasons, "unknown_sample_size"];
  }
  if (
    !Number.isInteger(observation.sampleSize) ||
    observation.sampleSize < minimumSample
  ) {
    reasons.push("insufficient_sample");
  }

  return reasons;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
};

const collectedAtValue = (observation: MatchupEvidenceObservation): number => {
  const value = Date.parse(observation.provenance.collectedAt);
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
};

export function summarizeCrossSourceEvidence(
  reference: MatchupEvidenceObservation,
  observations: MatchupEvidenceObservation[],
  options: EvidenceAggregationOptions = {}
): CrossSourceEvidenceSummary {
  const resolved: Required<EvidenceAggregationOptions> = {
    minimumSample: options.minimumSample ?? DEFAULT_EVIDENCE_MINIMUM_SAMPLE,
    minimumWindowOverlapRatio:
      options.minimumWindowOverlapRatio ??
      MIN_COMPATIBLE_WINDOW_OVERLAP_RATIO,
    maximumWindowEndSkewMs:
      options.maximumWindowEndSkewMs ??
      MAX_COMPATIBLE_WINDOW_END_SKEW_MS
  };

  const candidates = [reference, ...observations.filter((item) => item.id !== reference.id)];
  const included: MatchupEvidenceObservation[] = [];
  const excluded: CrossSourceEvidenceSummary["excludedObservations"] = [];

  const eligibleByProvider = new Map<
    MatchupEvidenceObservation["provider"],
    MatchupEvidenceObservation[]
  >();

  for (const observation of candidates) {
    const reasons = [
      ...sourceScopeReasons(reference, observation, resolved),
      ...observationValueReasons(observation, resolved.minimumSample)
    ];

    if (reasons.length > 0) {
      excluded.push({ observation, reasons });
      continue;
    }

    const bucket = eligibleByProvider.get(observation.provider) ?? [];
    bucket.push(observation);
    eligibleByProvider.set(observation.provider, bucket);
  }

  for (const providerObservations of eligibleByProvider.values()) {
    providerObservations.sort(
      (left, right) =>
        collectedAtValue(right) - collectedAtValue(left) ||
        right.id.localeCompare(left.id)
    );

    const [latest, ...superseded] = providerObservations;
    included.push(latest);

    for (const observation of superseded) {
      excluded.push({
        observation,
        reasons: ["superseded_provider_observation"]
      });
    }
  }

  included.sort(
    (left, right) =>
      (left.id === reference.id ? -1 : 0) -
        (right.id === reference.id ? -1 : 0) ||
      left.provider.localeCompare(right.provider) ||
      left.id.localeCompare(right.id)
  );

  if (included.length < 2) {
    return {
      referenceObservationId: reference.id,
      includedObservations: included,
      excludedObservations: excluded,
      disagreementLevel: "single_source"
    };
  }

  const rates = included.map((observation) => observation.sourceWinRate);
  const minimum = Math.min(...rates);
  const maximum = Math.max(...rates);
  const spreadPercentagePoints =
    Math.round((maximum - minimum) * 10_000) / 100;

  if (spreadPercentagePoints >= LARGE_DISAGREEMENT_PP) {
    return {
      referenceObservationId: reference.id,
      includedObservations: included,
      excludedObservations: excluded,
      disagreementLevel: "large",
      spreadPercentagePoints
    };
  }

  return {
    referenceObservationId: reference.id,
    includedObservations: included,
    excludedObservations: excluded,
    disagreementLevel:
      spreadPercentagePoints >= NOTICEABLE_DISAGREEMENT_PP
        ? "noticeable"
        : "aligned",
    spreadPercentagePoints,
    consensusWinRate: median(rates)
  };
}
