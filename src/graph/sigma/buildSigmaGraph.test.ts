import { describe, expect, it } from "vitest";
import { fixtureRelationships, scope } from "../../data/fixtures";
import { heroes } from "../../data/heroes";
import { buildSigmaSpikeGraph } from "./buildSigmaGraph";

describe("buildSigmaSpikeGraph", () => {
  it("preserves the full hero roster and reliable directed relationships", () => {
    const relationships = fixtureRelationships.filter(
      (relationship) => relationship.sampleSize >= scope.minimumSample
    );
    const graph = buildSigmaSpikeGraph(heroes, relationships);

    expect(graph.order).toBe(heroes.length);
    expect(graph.size).toBe(relationships.length);

    for (const relationship of relationships) {
      expect(
        graph.hasDirectedEdge(
          relationship.sourceHeroId,
          relationship.targetHeroId
        )
      ).toBe(true);
    }
  });
});
