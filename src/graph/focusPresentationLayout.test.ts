import { describe, expect, it } from "vitest";
import type { Hero } from "../domain/types";
import { layoutFocusPresentation } from "./focusPresentationLayout";

const hero = (id: string, x: number, y: number): Hero => ({
  id,
  slug: id,
  name: id,
  aliases: [],
  spriteIndex: 0,
  x,
  y
});

describe("layoutFocusPresentation", () => {
  it("keeps the selected hero anchored", () => {
    const selected = hero("selected", 400, 300);
    const layout = layoutFocusPresentation(selected, {
      incoming: [hero("left", 420, 260)],
      outgoing: [hero("right", 380, 340)]
    });

    expect(layout.get("selected")).toEqual({ x: 400, y: 300 });
  });

  it("puts incoming heroes on the left and outgoing heroes on the right", () => {
    const selected = hero("selected", 400, 300);
    const incoming = [
      hero("incoming-a", 900, 500),
      hero("incoming-b", 700, 100)
    ];
    const outgoing = [
      hero("outgoing-a", 100, 500),
      hero("outgoing-b", 200, 100)
    ];

    const layout = layoutFocusPresentation(selected, { incoming, outgoing });

    for (const item of incoming) {
      expect(layout.get(item.id)!.x).toBeLessThan(selected.x);
    }
    for (const item of outgoing) {
      expect(layout.get(item.id)!.x).toBeGreaterThan(selected.x);
    }
  });

  it("keeps every active hero on the same readable radius", () => {
    const selected = hero("selected", 400, 300);
    const related = [
      hero("a", 450, 290),
      hero("b", 460, 300),
      hero("c", 470, 310)
    ];
    const layout = layoutFocusPresentation(selected, {
      incoming: related,
      outgoing: []
    });

    for (const item of related) {
      const point = layout.get(item.id)!;
      expect(Math.hypot(point.x - selected.x, point.y - selected.y)).toBeCloseTo(330, 1);
    }
  });

  it("keeps relationship rank order from top to bottom on each side", () => {
    const selected = hero("selected", 400, 300);
    const incoming = [
      hero("rank-1", 100, 600),
      hero("rank-2", 120, 80),
      hero("rank-3", 110, 320)
    ];
    const layout = layoutFocusPresentation(selected, { incoming, outgoing: [] });

    expect(layout.get("rank-1")!.y).toBeLessThan(layout.get("rank-2")!.y);
    expect(layout.get("rank-2")!.y).toBeLessThan(layout.get("rank-3")!.y);
  });

  it("keeps sparse sides compact instead of stretching heroes to arc extremes", () => {
    const selected = hero("selected", 400, 300);
    const incoming = [
      hero("rank-1", 100, 100),
      hero("rank-2", 100, 500)
    ];
    const layout = layoutFocusPresentation(selected, { incoming, outgoing: [] });

    const first = layout.get("rank-1")!;
    const second = layout.get("rank-2")!;
    const firstAngle = Math.atan2(first.y - selected.y, first.x - selected.x);
    const secondAngle = Math.atan2(second.y - selected.y, second.x - selected.x);
    const rawSeparation = Math.abs(firstAngle - secondAngle);
    const separation = Math.min(rawSeparation, Math.PI * 2 - rawSeparation);

    expect(separation).toBeGreaterThan(Math.PI / 8);
    expect(separation).toBeLessThan(Math.PI / 5);
  });

  it("keeps a five-hero side evenly separated", () => {
    const selected = hero("selected", 400, 300);
    const incoming = Array.from({ length: 5 }, (_, index) =>
      hero(`incoming-${index}`, 100, 80 + index * 100)
    );
    const layout = layoutFocusPresentation(selected, { incoming, outgoing: [] });
    const points = incoming.map((item) => layout.get(item.id)!);

    for (let index = 1; index < points.length; index += 1) {
      expect(
        Math.hypot(
          points[index].x - points[index - 1].x,
          points[index].y - points[index - 1].y
        )
      ).toBeGreaterThanOrEqual(140);
    }
  });

  it("deduplicates a hero that appears in both directions", () => {
    const selected = hero("selected", 400, 300);
    const shared = hero("shared", 100, 200);
    const layout = layoutFocusPresentation(selected, {
      incoming: [shared],
      outgoing: [shared]
    });

    expect([...layout.keys()].filter((id) => id === "shared")).toHaveLength(1);
    expect(layout.get("shared")!.x).toBeLessThan(selected.x);
  });

  it("is deterministic", () => {
    const selected = hero("selected", 400, 300);
    const groups = {
      incoming: [hero("a", 100, 100), hero("b", 100, 500)],
      outgoing: [hero("c", 800, 100), hero("d", 800, 500)]
    };

    expect([...layoutFocusPresentation(selected, groups).entries()]).toEqual(
      [...layoutFocusPresentation(selected, groups).entries()]
    );
  });
});
