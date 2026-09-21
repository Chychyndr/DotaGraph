import { describe, expect, it } from "vitest";
import type {
  MatchupEvidenceObservation,
  StatisticalProvider
} from "./types";
import {
  LARGE_DISAGREEMENT_PP,
  NOTICEABLE_DISAGREEMENT_PP,
  summarizeCrossSourceEvidence
} from "./sourceEvidence";

const makeObservation = ({
  id,
  provider,
  sourceWinRate,
  sampleSize = 1200,
  patch = "7.41f",
  rankScope = "ancient_plus",
  matchPopulation = "ranked_all_draft_5v5",
  observationWindowStart = "2026-09-16T00:00:00Z",
  observationWindowEndExclusive = "2026-09-21T12:00:00Z",
  collectedAt = "2026-09-21T12:05:00Z"
}: {
  id: string;
  provider: StatisticalProvider;
  sourceWinRate: number;
  sampleSize?: number;
  patch?: string;
  rankScope?: string;
  matchPopulation?: string;
  observationWindowStart?: string;
  observationWindowEndExclusive?: string;
  collectedAt?: string;
}): MatchupEvidenceObservation => ({
  id,
  provider,
  sourceHeroId: "viper",
  targetHeroId: "huskar",
  sourceWinRate,
  sampleSize,
  scope: {
    patch,
    rankScope,
    matchPopulation,
    observationWindowStart,
    observationWindowEndExclusive
  },
  provenance: {
    sourceUrl: `https://example.test/${provider.toLowerCase()}`,
    queryScope: `${patch}:${rankScope}:${matchPopulation}`,
    collectedAt
  }
});

const reference = makeObservation({
  id: "opendota-current",
  provider: "OpenDota",
  sourceWinRate: 0.548,
  sampleSize: 5400
});

describe("cross-source matchup evidence", () => {
  it("uses an equal-provider median without inventing an aggregate sample size", () => {
    const summary = summarizeCrossSourceEvidence(reference, [
      makeObservation({
        id: "stratz-current",
        provider: "STRATZ",
        sourceWinRate: 0.541,
        sampleSize: 50000
      }),
      makeObservation({
        id: "dotabuff-current",
        provider: "DOTABUFF",
        sourceWinRate: 0.552,
        sampleSize: 700
      })
    ]);

    expect(summary.disagreementLevel).toBe("aligned");
    expect(summary.consensusWinRate).toBeCloseTo(0.548);
    expect(summary.spreadPercentagePoints).toBeCloseTo(1.1);
    expect(summary.includedObservations.map((item) => item.provider)).toEqual([
      "OpenDota",
      "DOTABUFF",
      "STRATZ"
    ]);
    expect(summary).not.toHaveProperty("sampleSize");
  });

  it("marks noticeable disagreement but still exposes the source median", () => {
    const summary = summarizeCrossSourceEvidence(reference, [
      makeObservation({
        id: "stratz-current",
        provider: "STRATZ",
        sourceWinRate: 0.578
      })
    ]);

    expect(summary.spreadPercentagePoints).toBeCloseTo(3);
    expect(summary.spreadPercentagePoints).toBeGreaterThanOrEqual(
      NOTICEABLE_DISAGREEMENT_PP
    );
    expect(summary.spreadPercentagePoints).toBeLessThan(LARGE_DISAGREEMENT_PP);
    expect(summary.disagreementLevel).toBe("noticeable");
    expect(summary.consensusWinRate).toBeCloseTo(0.563);
  });

  it("suppresses a consensus rate when compatible providers disagree by five points or more", () => {
    const summary = summarizeCrossSourceEvidence(reference, [
      makeObservation({
        id: "stratz-current",
        provider: "STRATZ",
        sourceWinRate: 0.598
      })
    ]);

    expect(summary.disagreementLevel).toBe("large");
    expect(summary.spreadPercentagePoints).toBeCloseTo(5);
    expect(summary.consensusWinRate).toBeUndefined();
  });

  it("keeps incompatible and unreliable observations separate from the aggregate", () => {
    const differentPatch = makeObservation({
      id: "stratz-old-patch",
      provider: "STRATZ",
      sourceWinRate: 0.55,
      patch: "7.41e"
    });
    const proPopulation = makeObservation({
      id: "d2pt-pro",
      provider: "Dota2ProTracker",
      sourceWinRate: 0.57,
      rankScope: "pro",
      matchPopulation: "professional_matches"
    });
    const lowSample = makeObservation({
      id: "dotabuff-small",
      provider: "DOTABUFF",
      sourceWinRate: 0.56,
      sampleSize: 320
    });

    const summary = summarizeCrossSourceEvidence(reference, [
      differentPatch,
      proPopulation,
      lowSample
    ]);

    expect(summary.disagreementLevel).toBe("single_source");
    expect(summary.consensusWinRate).toBeUndefined();
    expect(summary.includedObservations.map((item) => item.id)).toEqual([
      reference.id
    ]);

    const reasons = new Map(
      summary.excludedObservations.map(({ observation, reasons }) => [
        observation.id,
        reasons
      ])
    );
    expect(reasons.get(differentPatch.id)).toContain("different_patch");
    expect(reasons.get(proPopulation.id)).toEqual(
      expect.arrayContaining([
        "different_rank_scope",
        "different_match_population"
      ])
    );
    expect(reasons.get(lowSample.id)).toContain("insufficient_sample");
  });

  it("requires compatible observation windows and valid statistical values", () => {
    const oldWindow = makeObservation({
      id: "stratz-old-window",
      provider: "STRATZ",
      sourceWinRate: 0.55,
      observationWindowStart: "2026-09-01T00:00:00Z",
      observationWindowEndExclusive: "2026-09-10T00:00:00Z",
      collectedAt: "2026-09-10T00:05:00Z"
    });
    const invalidRate = makeObservation({
      id: "dotabuff-invalid-rate",
      provider: "DOTABUFF",
      sourceWinRate: 1.2
    });
    const unknownSample = makeObservation({
      id: "d2pt-unknown-sample",
      provider: "Dota2ProTracker",
      sourceWinRate: 0.56
    });
    delete unknownSample.sampleSize;

    const summary = summarizeCrossSourceEvidence(reference, [
      oldWindow,
      invalidRate,
      unknownSample
    ]);
    const reasons = new Map(
      summary.excludedObservations.map(({ observation, reasons }) => [
        observation.id,
        reasons
      ])
    );

    expect(reasons.get(oldWindow.id)).toContain(
      "misaligned_observation_window"
    );
    expect(reasons.get(invalidRate.id)).toContain("invalid_win_rate");
    expect(reasons.get(unknownSample.id)).toContain("unknown_sample_size");
  });

  it("uses only the newest compatible observation from each provider", () => {
    const older = makeObservation({
      id: "stratz-older",
      provider: "STRATZ",
      sourceWinRate: 0.545,
      collectedAt: "2026-09-21T10:00:00Z"
    });
    const newer = makeObservation({
      id: "stratz-newer",
      provider: "STRATZ",
      sourceWinRate: 0.55,
      collectedAt: "2026-09-21T12:10:00Z"
    });

    const summary = summarizeCrossSourceEvidence(reference, [older, newer]);

    expect(summary.includedObservations.map((item) => item.id)).toEqual([
      reference.id,
      newer.id
    ]);
    expect(
      summary.excludedObservations.find(
        ({ observation }) => observation.id === older.id
      )?.reasons
    ).toEqual(["superseded_provider_observation"]);
  });
});
