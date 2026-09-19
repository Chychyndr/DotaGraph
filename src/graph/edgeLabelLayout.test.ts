import { describe, expect, it } from "vitest";
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

  it("separates a dense ten-edge current-data focus fan", () => {
    const placements = layoutSourceAnchoredEdgeLabels(
      [
        { id: "phantom-lancer--viper", segment: { x1: 870.31, y1: 413.58, x2: 706.51, y2: 246.33 } },
        { id: "dark-seer--viper", segment: { x1: 657.24, y1: 212.88, x2: 633.85, y2: 209.54 } },
        { id: "invoker--viper", segment: { x1: 723.47, y1: 183.48, x2: 711.93, y2: 191.36 } },
        { id: "juggernaut--viper", segment: { x1: 848.14, y1: 515.8, x2: 697.77, y2: 252.93 } },
        { id: "pudge--viper", segment: { x1: 667.95, y1: 241.63, x2: 663.11, y2: 256.5 } },
        { id: "viper--huskar", segment: { x1: 716.25, y1: 211.97, x2: 737.7, y2: 210.02 } },
        { id: "viper--bristleback", segment: { x1: 691.56, y1: 252.64, x2: 714.58, y2: 308.95 } },
        { id: "viper--dragon-knight", segment: { x1: 707.23, y1: 241.12, x2: 828.62, y2: 341.66 } },
        { id: "viper--shadow-fiend", segment: { x1: 676.04, y1: 255.61, x2: 674.62, y2: 404.79 } },
        { id: "viper--silencer", segment: { x1: 714.53, y1: 227.75, x2: 766.65, y2: 244.36 } }
      ],
      [
        { x: 676.42, y: 215.61, radius: 43 },
        { x: 887.8, y: 431.44, radius: 28 },
        { x: 632.49, y: 209.35, radius: 28 },
        { x: 744.12, y: 169.38, radius: 28 },
        { x: 860.55, y: 537.5, radius: 28 },
        { x: 660.21, y: 265.4, radius: 28 },
        { x: 765.58, y: 207.47, radius: 28 },
        { x: 725.17, y: 334.87, radius: 28 },
        { x: 850.18, y: 359.52, radius: 28 },
        { x: 674.35, y: 432.79, radius: 28 },
        { x: 793.33, y: 252.86, radius: 28 }
      ]
    );

    const values = [...placements.values()];
    expect(values).toHaveLength(10);

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
