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

    expect(placement.angle).not.toBeCloseTo(0, 2);
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
