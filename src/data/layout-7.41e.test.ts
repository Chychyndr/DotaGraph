import { describe, expect, it } from "vitest";
import heroCatalog from "./heroCatalog.json";
import layout from "./layout-7.41e.json";

const positions = layout.positions as Record<string, { x: number; y: number }>;

describe("patch 7.41e real-data layout", () => {
  it("covers the complete hero catalog with explicit provenance", () => {
    expect(layout.patch).toBe("7.41e");
    expect(layout.scope.source).toBe("OpenDota");
    expect(layout.scope.rankScope).toBe("ancient_plus");
    expect(layout.scope.minimumPairSample).toBe(500);
    expect(layout.coverage.catalogHeroCount).toBe(heroCatalog.length);
    expect(layout.coverage.openDotaMappedHeroCount).toBe(heroCatalog.length);
    expect(layout.coverage.missingHeroSlugs).toEqual([]);
    expect(Object.keys(positions)).toHaveLength(heroCatalog.length);

    for (const hero of heroCatalog) {
      expect(positions[hero.slug], hero.slug).toBeDefined();
    }
  });

  it("keeps every hero inside the graph canvas", () => {
    for (const [slug, point] of Object.entries(positions)) {
      expect(point.x, `${slug} x`).toBeGreaterThanOrEqual(52);
      expect(point.x, `${slug} x`).toBeLessThanOrEqual(1148);
      expect(point.y, `${slug} y`).toBeGreaterThanOrEqual(52);
      expect(point.y, `${slug} y`).toBeLessThanOrEqual(708);
    }
  });

  it("keeps portrait centers collision-safe", () => {
    const entries = Object.entries(positions);

    for (let left = 0; left < entries.length; left += 1) {
      for (let right = left + 1; right < entries.length; right += 1) {
        const [leftSlug, a] = entries[left];
        const [rightSlug, b] = entries[right];
        const distance = Math.hypot(b.x - a.x, b.y - a.y);

        expect(
          distance,
          `${leftSlug} and ${rightSlug}`
        ).toBeGreaterThanOrEqual(45.7);
      }
    }
  });

  it("records measurable real-affinity layout quality", () => {
    expect(layout.coverage.qualifyingPairCount).toBeGreaterThan(0);
    expect(layout.coverage.layoutAffinityCount).toBeGreaterThan(0);
    expect(layout.metrics.edgeCount).toBe(layout.coverage.layoutAffinityCount);
    expect(layout.metrics.medianDistance).toBeGreaterThan(0);
    expect(layout.metrics.p95Distance).toBeGreaterThanOrEqual(
      layout.metrics.medianDistance
    );
  });
});
