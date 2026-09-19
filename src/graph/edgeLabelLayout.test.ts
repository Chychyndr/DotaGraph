import { describe, expect, it } from "vitest";
import type { Hero } from "../domain/types";
import { layoutFocusPresentation } from "./focusPresentationLayout";
import {
  edgeLabelRectsOverlap,
  layoutSourceAnchoredEdgeLabels
} from "./edgeLabelLayout";

describe("layoutSourceAnchoredEdgeLabels", () => {
  it("keeps labels on the source side of their edges", () => {
    const placements = layoutSourceAnchoredEdgeLabels([
      { id: "a", segment: { x1: 40, y1: 100, x2: 360, y2: 100 } },
      { id: "b", segment: { x1: 40, y1: 100, x2: 360, y2: 135 } }
    ], [{ x: 20, y: 100, radius: 36 }]);

    expect(placements.get("a")?.t).toBeGreaterThanOrEqual(0.2);
    expect(placements.get("a")?.t).toBeLessThanOrEqual(0.62);
    expect(placements.get("b")?.t).toBeGreaterThanOrEqual(0.2);
    expect(placements.get("b")?.t).toBeLessThanOrEqual(0.62);
  });

  it("keeps every badge center on its own relationship segment", () => {
    const inputs = [
      { id: "horizontal", segment: { x1: 80, y1: 120, x2: 420, y2: 120 } },
      { id: "diagonal", segment: { x1: 90, y1: 180, x2: 390, y2: 360 } }
    ];

    const placements = layoutSourceAnchoredEdgeLabels(inputs, []);

    for (const input of inputs) {
      const placement = placements.get(input.id)!;
      const { x1, y1, x2, y2 } = input.segment;
      const expectedX = x1 + (x2 - x1) * placement.t;
      const expectedY = y1 + (y2 - y1) * placement.t;

      expect(placement.offset).toBe(0);
      expect(placement.x).toBeCloseTo(expectedX, 6);
      expect(placement.y).toBeCloseTo(expectedY, 6);
    }
  });

  it("slides along the edge to avoid an unrelated hero portrait", () => {
    const segment = { x1: 100, y1: 200, x2: 500, y2: 200 };
    const placements = layoutSourceAnchoredEdgeLabels(
      [{ id: "edge", segment }],
      [{ x: 236, y: 200, radius: 34 }]
    );

    const placement = placements.get("edge")!;

    expect(placement.offset).toBe(0);
    expect(placement.y).toBeCloseTo(200, 6);
    expect(Math.abs(placement.x - 236)).toBeGreaterThan(34 + 23);
  });

  it("separates near-parallel labels from the same source", () => {
    const placements = layoutSourceAnchoredEdgeLabels([
      { id: "a", segment: { x1: 40, y1: 100, x2: 380, y2: 100 } },
      { id: "b", segment: { x1: 40, y1: 100, x2: 380, y2: 125 } },
      { id: "c", segment: { x1: 40, y1: 100, x2: 380, y2: 150 } }
    ], [{ x: 20, y: 100, radius: 36 }]);

    const a = placements.get("a")!;
    const b = placements.get("b")!;
    const c = placements.get("c")!;

    expect(edgeLabelRectsOverlap(a, b)).toBe(false);
    expect(edgeLabelRectsOverlap(a, c)).toBe(false);
    expect(edgeLabelRectsOverlap(b, c)).toBe(false);
  });

  it("separates a dense ten-edge fan after focus presentation spacing", () => {
    const makeHero = (id: string, x: number, y: number): Hero => ({
      id,
      slug: id,
      name: id,
      aliases: [],
      spriteIndex: 0,
      x,
      y
    });

    const selected = makeHero("selected", 600, 380);
    const related = [
      makeHero("a", 632, 366),
      makeHero("b", 645, 382),
      makeHero("c", 620, 405),
      makeHero("d", 655, 410),
      makeHero("e", 590, 430),
      makeHero("f", 560, 402),
      makeHero("g", 548, 376),
      makeHero("h", 565, 350),
      makeHero("i", 610, 340),
      makeHero("j", 640, 345)
    ];

    const focus = layoutFocusPresentation(selected, related);
    const point = (hero: Hero) => focus.get(hero.id) ?? hero;

    const edgeSegment = (
      source: Hero,
      target: Hero,
      sourceSelected: boolean,
      targetSelected: boolean
    ) => {
      const from = point(source);
      const to = point(target);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const ux = dx / length;
      const uy = dy / length;
      const sourcePadding = sourceSelected ? 40 : 25;
      const targetPadding = targetSelected ? 43 : 28;

      return {
        x1: from.x + ux * sourcePadding,
        y1: from.y + uy * sourcePadding,
        x2: to.x - ux * targetPadding,
        y2: to.y - uy * targetPadding
      };
    };

    const inputs = related.map((hero, index) => {
      const incoming = index < 5;
      return {
        id: hero.id,
        segment: incoming
          ? edgeSegment(hero, selected, false, true)
          : edgeSegment(selected, hero, true, false)
      };
    });

    const obstacles = [
      { ...point(selected), radius: 43 },
      ...related.map(hero => ({ ...point(hero), radius: 28 }))
    ];

    const placements = layoutSourceAnchoredEdgeLabels(inputs, obstacles);
    const values = [...placements.values()];
    expect(values).toHaveLength(10);

    for (const value of values) {
      expect(value.offset).toBe(0);
    }

    for (let left = 0; left < values.length; left += 1) {
      for (let right = left + 1; right < values.length; right += 1) {
        expect(edgeLabelRectsOverlap(values[left], values[right])).toBe(false);
      }
    }
  });

  it("is deterministic", () => {
    const inputs = [
      { id: "a", segment: { x1: 100, y1: 100, x2: 420, y2: 90 } },
      { id: "b", segment: { x1: 100, y1: 100, x2: 420, y2: 115 } }
    ];
    const obstacles = [{ x: 100, y: 100, radius: 40 }];

    expect(
      [...layoutSourceAnchoredEdgeLabels(inputs, obstacles).entries()]
    ).toEqual(
      [...layoutSourceAnchoredEdgeLabels(inputs, obstacles).entries()]
    );
  });
});
