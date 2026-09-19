import { describe, expect, it } from "vitest";
import type { MatchupRelationship } from "../domain/types";
import {
  mergeVisibleRelationships,
  selectHoverRelationships,
  selectOverviewBackbone
} from "./relationshipVisibility";

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
  it("keeps only the strongest incident overview relationship per hero", () => {
    const relationships = [
      rel("a-b", "a", "b", 0.09),
      rel("a-c", "a", "c", 0.08),
      rel("b-c", "b", "c", 0.07),
      rel("c-d", "c", "d", 0.06)
    ];

    const selected = selectOverviewBackbone(relationships);

    expect(selected.map(item => item.id)).toEqual(["a-b", "a-c", "c-d"]);
    expect(selected.length).toBeLessThanOrEqual(4);
  });

  it("is deterministic regardless of input order", () => {
    const relationships = [
      rel("a-b", "a", "b", 0.09),
      rel("a-c", "a", "c", 0.08),
      rel("c-d", "c", "d", 0.06)
    ];

    expect(selectOverviewBackbone(relationships)).toEqual(
      selectOverviewBackbone([...relationships].reverse())
    );
  });

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

  it("deduplicates visible relationship groups", () => {
    const a = rel("a-b", "a", "b", 0.09);
    const b = rel("a-c", "a", "c", 0.08);

    expect(mergeVisibleRelationships([a], [a, b]).map(item => item.id)).toEqual([
      "a-b",
      "a-c"
    ]);
  });
});
