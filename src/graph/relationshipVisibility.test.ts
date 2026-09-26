import { describe, expect, it } from "vitest";
import type { MatchupRelationship } from "../domain/types";
import { selectHoverRelationships } from "./relationshipVisibility";

const rel = (
  id: string,
  sourceHeroId: string,
  targetHeroId: string,
  rankingScore: number
): MatchupRelationship => ({
  id,
  sourceHeroId,
  targetHeroId,
  sourceWinRate: 0.55,
  sampleSize: 1000,
  patch: "7.41f",
  rankScope: "ancient_plus",
  sourceKind: "generated",
  rankingScore,
  baselineAdjustedDelta: rankingScore
});

describe("relationshipVisibility", () => {
  it("limits hover relationships to the strongest incident edges", () => {
    const relationships = [
      rel("a-b", "a", "b", 0.09),
      rel("c-a", "c", "a", 0.08),
      rel("a-d", "a", "d", 0.07),
      rel("e-a", "e", "a", 0.06)
    ];

    expect(
      selectHoverRelationships("a", relationships, 2).map(item => item.id)
    ).toEqual(["a-b", "c-a"]);
  });


});
