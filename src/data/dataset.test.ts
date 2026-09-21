import { describe, expect, it } from "vitest";
import { validateDataset } from "./dataset";

const validDataset = () => ({
  heroes: [
    {
      id: "viper",
      slug: "viper",
      name: "Viper",
      aliases: [],
      spriteIndex: 0,
      x: 100,
      y: 100
    },
    {
      id: "huskar",
      slug: "huskar",
      name: "Huskar",
      aliases: [],
      spriteIndex: 1,
      x: 200,
      y: 100
    }
  ],
  relationships: [
    {
      id: "viper--huskar",
      sourceHeroId: "viper",
      targetHeroId: "huskar",
      sourceWinRate: 0.56,
      sampleSize: 1200,
      patch: "7.41e",
      rankScope: "ancient_plus",
      sourceKind: "fixture"
    }
  ],
  scope: {
    patch: "7.41e",
    rankScope: "ancient_plus",
    rankLabel: "Ancient+",
    minimumSample: 500,
    maxVisiblePerDirection: 5
  },
  metadata: {
    schemaVersion: 1,
    generatedAt: "2026-09-18T00:00:00.000Z",
    freshness: {
      status: "current"
    }
  }
});

describe("validateDataset", () => {
  it("accepts a coherent published bundle", () => {
    expect(validateDataset(validDataset())).toEqual({
      ok: true,
      data: validDataset()
    });
  });

  it("rejects relationships that reference missing heroes", () => {
    const dataset = validDataset();
    dataset.relationships[0].targetHeroId = "missing-hero";

    const result = validateDataset(dataset);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContain(
        "Relationship at index 0 references an unknown target hero."
      );
    }
  });

  it("requires provenance details for schema v2 datasets", () => {
    const dataset = validDataset();
    dataset.metadata = {
      schemaVersion: 2,
      generatedAt: "2026-09-18T00:00:00.000Z",
      source: "OpenDota",
      observationWindowStart: "2026-09-16T00:00:00Z",
      observationWindowEndExclusive: "2026-09-18T00:00:00Z",
      freshness: { status: "current" }
    };

    const result = validateDataset(dataset);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContain(
        "Schema v2 datasets must include provenance details."
      );
    }
  });

  it("requires an explanation when upstream marks data stale", () => {
    const dataset = validDataset();
    dataset.metadata.freshness = { status: "stale" };

    const result = validateDataset(dataset);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContain("Stale datasets must include a reason.");
    }
  });
});
