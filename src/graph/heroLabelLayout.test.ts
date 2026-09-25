import { describe, expect, it } from "vitest";
import { layoutHeroLabels } from "./heroLabelLayout";

describe("layoutHeroLabels", () => {
  it("moves a label away from an active edge", () => {
    const placement = layoutHeroLabels(
      [{
        id: "hero",
        x: 100,
        y: 100,
        radius: 20,
        width: 80,
        height: 20,
        preferredAngle: 0
      }],
      [{ x1: 120, y1: 100, x2: 300, y2: 100 }],
      [{ id: "hero", x: 100, y: 100, radius: 23 }]
    ).get("hero")!;

    expect(Math.abs(placement.y - 100)).toBeGreaterThan(10);
  });

  it("keeps labels clear of another portrait", () => {
    const placement = layoutHeroLabels(
      [{
        id: "hero",
        x: 100,
        y: 100,
        radius: 20,
        width: 70,
        height: 20,
        preferredAngle: 0
      }],
      [],
      [
        { id: "hero", x: 100, y: 100, radius: 23 },
        { id: "neighbor", x: 155, y: 100, radius: 24 }
      ]
    ).get("hero")!;

    expect(placement.x - 35).toBeGreaterThan(179);
  });

  it("keeps a focus label outside a hard left-side card boundary", () => {
    const width = 70;
    const minX = 80;
    const placement = layoutHeroLabels(
      [{
        id: "hero",
        x: 100,
        y: 100,
        radius: 20,
        width,
        height: 20,
        preferredAngle: Math.PI
      }],
      [],
      [{ id: "hero", x: 100, y: 100, radius: 23 }],
      { minX }
    ).get("hero")!;

    expect(placement.x - width / 2).toBeGreaterThanOrEqual(minX);
  });

  it("treats viewport bounds as hard constraints even when in-bounds candidates collide", () => {
    const width = 70;
    const height = 20;
    const bounds = { minX: 0, maxX: 400, minY: 0, maxY: 200 };
    const blockers = Array.from({ length: 11 }, (_, index) => ({
      id: `blocker-${index}`,
      x: 300,
      y: 100,
      radius: 250
    }));

    const placement = layoutHeroLabels(
      [{
        id: "edge-hero",
        x: 40,
        y: 100,
        radius: 20,
        width,
        height,
        preferredAngle: Math.PI
      }],
      [],
      [{ id: "edge-hero", x: 40, y: 100, radius: 23 }, ...blockers],
      bounds
    ).get("edge-hero")!;

    expect(placement).toBeDefined();
    expect(placement.x - width / 2 - 3).toBeGreaterThanOrEqual(bounds.minX);
    expect(placement.x + width / 2 + 3).toBeLessThanOrEqual(bounds.maxX);
    expect(placement.y - height / 2 - 3).toBeGreaterThanOrEqual(bounds.minY);
    expect(placement.y + height / 2 + 3).toBeLessThanOrEqual(bounds.maxY);
  });

  it("is deterministic", () => {
    const inputs = [
      {
        id: "a",
        x: 100,
        y: 100,
        radius: 20,
        width: 60,
        height: 20,
        preferredAngle: 0
      },
      {
        id: "b",
        x: 180,
        y: 100,
        radius: 20,
        width: 60,
        height: 20,
        preferredAngle: Math.PI
      }
    ];
    const segments = [{ x1: 120, y1: 100, x2: 160, y2: 100 }];
    const obstacles = [
      { id: "a", x: 100, y: 100, radius: 23 },
      { id: "b", x: 180, y: 100, radius: 23 }
    ];

    expect([...layoutHeroLabels(inputs, segments, obstacles)]).toEqual(
      [...layoutHeroLabels(inputs, segments, obstacles)]
    );
  });
});
