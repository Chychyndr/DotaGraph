import { describe, expect, it } from "vitest";
import type { MatchupRelationship } from "../domain/types";
import { layoutFocusPresentation } from "./focusPresentationLayout";

const relationship = (
  id: string,
  sourceHeroId: string,
  targetHeroId: string
): MatchupRelationship => ({
  id,
  sourceHeroId,
  targetHeroId,
  sourceWinRate: 0.55,
  sampleSize: 1000,
  patch: "test",
  rankScope: "ancient_plus",
  sourceKind: "generated"
});

describe("layoutFocusPresentation", () => {
  it("places incoming and outgoing heroes in separate spacious columns", () => {
    const incoming = Array.from({ length: 5 }, (_, index) =>
      relationship(`in-${index}`, `incoming-${index}`, "selected")
    );
    const outgoing = Array.from({ length: 5 }, (_, index) =>
      relationship(`out-${index}`, "selected", `outgoing-${index}`)
    );

    const layout = layoutFocusPresentation("selected", incoming, outgoing);

    expect(layout.get("selected")).toEqual({
      x: 690,
      y: 380,
      role: "selected"
    });

    const incomingPoints = incoming.map((_, index) =>
      layout.get(`incoming-${index}`)!
    );
    const outgoingPoints = outgoing.map((_, index) =>
      layout.get(`outgoing-${index}`)!
    );

    expect(new Set(incomingPoints.map((point) => point.x))).toEqual(new Set([430]));
    expect(new Set(outgoingPoints.map((point) => point.x))).toEqual(new Set([975]));

    for (const points of [incomingPoints, outgoingPoints]) {
      for (let index = 1; index < points.length; index += 1) {
        expect(points[index].y - points[index - 1].y).toBeGreaterThanOrEqual(100);
      }
    }
  });

  it("keeps a single neighbor vertically centered", () => {
    const layout = layoutFocusPresentation(
      "selected",
      [relationship("in", "neighbor", "selected")],
      []
    );

    expect(layout.get("neighbor")).toEqual({
      x: 430,
      y: 380,
      role: "incoming"
    });
  });

  it("deduplicates a neighbor that appears in both directions", () => {
    const layout = layoutFocusPresentation(
      "selected",
      [relationship("in", "neighbor", "selected")],
      [relationship("out", "selected", "neighbor")]
    );

    expect([...layout.keys()]).toEqual(["selected", "neighbor"]);
    expect(layout.get("neighbor")?.role).toBe("incoming");
  });

  it("uses a tighter compact layout without changing role semantics", () => {
    const layout = layoutFocusPresentation(
      "selected",
      [relationship("in", "incoming", "selected")],
      [relationship("out", "selected", "outgoing")],
      { compact: true }
    );

    expect(layout.get("selected")).toEqual({
      x: 600,
      y: 330,
      role: "selected"
    });
    expect(layout.get("incoming")?.x).toBe(465);
    expect(layout.get("outgoing")?.x).toBe(735);
  });
});
