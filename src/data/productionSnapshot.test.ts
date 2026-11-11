import { describe, expect, it } from "vitest";
import heroCatalog from "./heroCatalog.json";
import { buildDatasetFromProductionSnapshot } from "./productionSnapshot";

const snapshot = (generatedAt = "2026-09-19T08:00:00Z") => {
  const positions = Object.fromEntries(
    heroCatalog.map((hero, index) => [
      hero.slug,
      {
        x: 60 + (index % 16) * 65,
        y: 60 + Math.floor(index / 16) * 75
      }
    ])
  );

  const heroStats = Object.fromEntries(
    heroCatalog.map((hero) => [
      hero.slug,
      {
        overallWinRate: 0.5,
        pairObservationGames: 5000,
        matchCount: 1000
      }
    ])
  );

  return {
    schemaVersion: 2,
    kind: "current-production-matchups",
    patch: "7.41f",
    generatedAt,
    scope: {
      rankScope: "ancient_plus",
      rankLabel: "Ancient+",
      minimumSample: 500,
      maxVisiblePerDirection: 5,
      observationWindowStart: "2026-09-16T00:00:00Z",
      observationWindowEndExclusive: "2026-09-19T08:00:00Z"
    },
    provenance: {
      headlineSource: "OpenDota",
      sourceUrl: "https://www.opendota.com/",
      endpoint: "/api/explorer",
      queryMode: "public_matches",
      secondarySources: ["STRATZ", "DOTABUFF", "Dota2ProTracker"]
    },
    positions,
    heroStats,
    evidenceObservations: [
      {
        id: "opendota-immortal-viper--huskar",
        provider: "OpenDota",
        sourceSlug: "viper",
        targetSlug: "huskar",
        sourceWinRate: 0.608,
        sampleSize: 184,
        scope: {
          patch: "7.41f",
          rankScope: "immortal",
          matchPopulation: "ranked_all_draft_5v5",
          observationWindowStart: "2026-09-16T00:00:00Z",
          observationWindowEndExclusive: "2026-09-19T08:00:00Z"
        },
        provenance: {
          sourceUrl: "https://www.opendota.com/",
          queryScope: "public_matches:avg_rank_tier>=80:game_mode=22:lobby_type=7",
          collectedAt: "2026-09-19T08:00:00Z"
        }
      }
    ],
    relationships: [
      {
        sourceSlug: "viper",
        targetSlug: "huskar",
        sourceWinRate: 0.632,
        sampleSize: 652,
        sourceBaseline: 0.488,
        targetBaseline: 0.463,
        expectedWinRate: 0.512,
        baselineAdjustedDelta: 0.12,
        standardError: 0.019,
        rankingScore: 0.088,
        source: "OpenDota"
      }
    ]
  };
};

describe("buildDatasetFromProductionSnapshot", () => {
  it("maps current generated data into app relationships", () => {
    const result = buildDatasetFromProductionSnapshot(
      snapshot(),
      Date.parse("2026-09-19T09:00:00Z")
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.scope.patch).toBe("7.41f");
    expect(result.data.heroes).toHaveLength(127);
    expect(result.data.relationships).toHaveLength(1);

    const relationship = result.data.relationships[0];
    expect(relationship.sourceHeroId).toBe("viper");
    expect(relationship.targetHeroId).toBe("huskar");
    expect(relationship.sourceWinRate).toBeCloseTo(0.632);
    expect(relationship.rankingScore).toBeCloseTo(0.088);
    expect(relationship.provenanceSource).toBe("OpenDota");
    expect(result.data.metadata.provenance).toEqual({
      headlineSource: "OpenDota",
      sourceUrl: "https://www.opendota.com/",
      endpoint: "/api/explorer",
      queryMode: "public_matches",
      secondarySources: ["STRATZ", "DOTABUFF", "Dota2ProTracker"]
    });
    expect(result.data.metadata.freshness.status).toBe("current");
    expect(result.data.evidenceObservations).toEqual([
      {
        id: "opendota-immortal-viper--huskar",
        provider: "OpenDota",
        sourceHeroId: "viper",
        targetHeroId: "huskar",
        sourceWinRate: 0.608,
        sampleSize: 184,
        scope: {
          patch: "7.41f",
          rankScope: "immortal",
          matchPopulation: "ranked_all_draft_5v5",
          observationWindowStart: "2026-09-16T00:00:00Z",
          observationWindowEndExclusive: "2026-09-19T08:00:00Z"
        },
        provenance: {
          sourceUrl: "https://www.opendota.com/",
          queryScope: "public_matches:avg_rank_tier>=80:game_mode=22:lobby_type=7",
          collectedAt: "2026-09-19T08:00:00Z"
        }
      }
    ]);
  });

  it.each(["not a url", "javascript:alert(1)", "data:text/plain,example", "file:///example"])(
    "rejects non-web provenance links: %s",
    (url) => {
      const raw = snapshot();
      raw.provenance.sourceUrl = url;
      const headline = buildDatasetFromProductionSnapshot(raw);
      expect(headline).toEqual({
        ok: false,
        issues: ["Production snapshot provenance sourceUrl must be a valid HTTP(S) URL."]
      });

      const evidence = snapshot();
      evidence.evidenceObservations[0].provenance.sourceUrl = url;
      expect(buildDatasetFromProductionSnapshot(evidence)).toEqual({
        ok: false,
        issues: ["Production evidence observation at index 0 is invalid."]
      });
    }
  );

  it("accepts HTTP provenance links", () => {
    const raw = snapshot();
    raw.provenance.sourceUrl = "http://www.opendota.com/";
    raw.evidenceObservations[0].provenance.sourceUrl = "http://www.opendota.com/";
    expect(buildDatasetFromProductionSnapshot(raw).ok).toBe(true);
  });

  it("accepts small clock skew but rejects a future-dated snapshot", () => {
    expect(buildDatasetFromProductionSnapshot(
      snapshot(), Date.parse("2026-09-19T07:55:00Z")
    ).ok).toBe(true);
    expect(buildDatasetFromProductionSnapshot(
      snapshot(), Date.parse("2026-09-19T07:54:59Z")
    )).toEqual({
      ok: false,
      issues: ["Production snapshot generatedAt is in the future."]
    });
  });

  it.each([
    ["2026-09-15T00:00:00Z", "must have positive duration"],
    ["2026-09-16T00:00:00Z", "must have positive duration"],
    ["2026-09-19T08:00:01Z", "ends after generatedAt"]
  ])("rejects an impossible headline window ending at %s", (end, issue) => {
    const raw = snapshot();
    raw.scope.observationWindowEndExclusive = end;

    expect(buildDatasetFromProductionSnapshot(raw, Date.parse("2026-09-19T09:00:00Z"))).toEqual({
      ok: false,
      issues: [`Production snapshot observation window ${issue}.`]
    });
  });

  it("marks snapshots stale after 36 hours", () => {
    const result = buildDatasetFromProductionSnapshot(
      snapshot(),
      Date.parse("2026-09-21T08:01:00Z")
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.metadata.freshness.status).toBe("stale");
    expect(result.data.metadata.freshness.reason).toContain("48 hours old");
  });

  it("rejects generated relationships below the minimum sample", () => {
    const raw = snapshot();
    raw.relationships[0].sampleSize = 499;

    const result = buildDatasetFromProductionSnapshot(raw);
    expect(result.ok).toBe(false);
  });
});
