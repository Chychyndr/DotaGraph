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

  it("honors a per-edge preferred anchor while keeping the badge on the line", () => {
    const segment = { x1: 100, y1: 160, x2: 500, y2: 160 };
    const placement = layoutSourceAnchoredEdgeLabels([
      { id: "edge", segment, preferredT: 0.46 }
    ], []).get("edge")!;

    expect(placement.offset).toBe(0);
    expect(placement.t).toBeCloseTo(0.46, 2);
    expect(placement.x).toBeCloseTo(284, 1);
    expect(placement.y).toBeCloseTo(160, 6);
  });

  it("uses the requested compact badge size scale", () => {
    const placement = layoutSourceAnchoredEdgeLabels(
      [{ id: "compact", segment: { x1: 100, y1: 100, x2: 500, y2: 100 } }],
      [],
      [],
      { sizeScale: 0.8 }
    ).get("compact")!;

    expect(placement.scale).toBeCloseTo(0.8, 3);
  });

  it("keeps a source fallback inside hard viewport bounds", () => {
    const bounds = { left: 0, right: 240, top: 0, bottom: 200 };
    const source = { x: 18, y: 100, radius: 18 };
    const placement = layoutSourceAnchoredEdgeLabels(
      [{
        id: "bounded",
        segment: { x1: 36, y1: 100, x2: 52, y2: 100 },
        source
      }],
      [
        source,
        { x: 54, y: 100, radius: 22 }
      ],
      [],
      { sizeScale: 0.8, bounds }
    ).get("bounded")!;

    const gap = 2;
    const halfWidth = 46 * placement.scale / 2 + gap;
    const halfHeight = 18 * placement.scale / 2 + gap;

    expect(placement.leader).toBeDefined();
    expect(placement.x - halfWidth).toBeGreaterThanOrEqual(bounds.left);
    expect(placement.x + halfWidth).toBeLessThanOrEqual(bounds.right);
    expect(placement.y - halfHeight).toBeGreaterThanOrEqual(bounds.top);
    expect(placement.y + halfHeight).toBeLessThanOrEqual(bounds.bottom);
  });

  it("shrinks a badge when a stable graph edge is too short for the normal pill", () => {
    const placement = layoutSourceAnchoredEdgeLabels([
      { id: "short", segment: { x1: 100, y1: 100, x2: 140, y2: 100 } }
    ], []).get("short")!;

    expect(placement.scale).toBeLessThan(1);
    expect(placement.scale).toBeGreaterThanOrEqual(0.8);
    expect(placement.offset).toBe(0);
    expect(placement.y).toBeCloseTo(100, 6);
  });

  it("moves an impossible short-edge badge onto a source-side line extension", () => {
    const source = { x: 100, y: 100, radius: 18 };
    const placement = layoutSourceAnchoredEdgeLabels(
      [{
        id: "cramped",
        segment: { x1: 120, y1: 100, x2: 136, y2: 100 },
        source
      }],
      [
        source,
        { x: 154, y: 100, radius: 18 }
      ]
    ).get("cramped")!;

    expect(placement.leader).toBeDefined();
    expect(placement.t).toBeLessThan(0);
    expect(placement.offset).toBe(0);
    expect(placement.scale).toBe(1);
    expect(placement.y).toBeCloseTo(100, 6);
  });

  it("extends farther on the source side when nearby portraits crowd the fallback", () => {
    const source = { x: 100, y: 100, radius: 18 };
    const placement = layoutSourceAnchoredEdgeLabels(
      [{
        id: "crowded",
        segment: { x1: 120, y1: 100, x2: 136, y2: 100 },
        source
      }],
      [
        source,
        { x: 154, y: 100, radius: 18 },
        { x: 55, y: 100, radius: 10 },
        { x: 37, y: 100, radius: 10 },
        { x: 19, y: 100, radius: 10 },
        { x: 1, y: 100, radius: 10 },
        { x: -17, y: 100, radius: 10 }
      ]
    ).get("crowded")!;

    expect(placement.leader).toBeDefined();
    expect(placement.t).toBeLessThan(0);
    expect(placement.x).toBeLessThan(-20);
  });

  it("fans a source leader around a blocked straight continuation", () => {
    const source = { x: 100, y: 100, radius: 18 };
    const straightBlockers = [55, 37, 19, 1, -17, -41, -65, -95, -125, -165]
      .map((x) => ({ x, y: 100, radius: 12 }));
    const placement = layoutSourceAnchoredEdgeLabels(
      [{
        id: "fan",
        segment: { x1: 120, y1: 100, x2: 136, y2: 100 },
        source
      }],
      [
        source,
        { x: 154, y: 100, radius: 18 },
        ...straightBlockers
      ]
    ).get("fan")!;

    expect(placement.leader).toBeDefined();
    expect(Math.abs(placement.y - 100)).toBeGreaterThan(5);
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

  it("keeps badges clear of hero-label rectangle obstacles", () => {
    const segment = { x1: 100, y1: 200, x2: 500, y2: 200 };
    const placement = layoutSourceAnchoredEdgeLabels(
      [{ id: "edge", segment, preferredT: 0.34 }],
      [],
      [{ x: 236, y: 200, width: 96, height: 24 }]
    ).get("edge")!;

    expect(placement.y).toBeCloseTo(200, 6);
    expect(Math.abs(placement.x - 236)).toBeGreaterThan(48 + 23);
  });

  it("escapes a hard portrait rectangle when every inline position is blocked", () => {
    const source = { x: 100, y: 100, radius: 18 };
    const obstacle = { x: 150, y: 100, width: 180, height: 60 };
    const placement = layoutSourceAnchoredEdgeLabels(
      [{
        id: "hard-rect",
        segment: { x1: 120, y1: 100, x2: 180, y2: 100 },
        source
      }],
      [source],
      [obstacle]
    ).get("hard-rect")!;

    const gap = 2;
    const halfWidth = 46 * placement.scale / 2 + gap;
    const halfHeight = 18 * placement.scale / 2 + gap;
    const overlaps =
      placement.x - halfWidth < obstacle.x + obstacle.width / 2 &&
      placement.x + halfWidth > obstacle.x - obstacle.width / 2 &&
      placement.y - halfHeight < obstacle.y + obstacle.height / 2 &&
      placement.y + halfHeight > obstacle.y - obstacle.height / 2;

    expect(placement.leader).toBeDefined();
    expect(overlaps).toBe(false);
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
