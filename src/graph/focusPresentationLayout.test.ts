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
    const layout = layoutFocusPresentation(selected, [
      hero("close", 450, 300)
    ]);

    expect(layout.get("selected")).toEqual({ x: 400, y: 300 });
  });

  it("pushes a too-close active hero far enough from the selected hero", () => {
    const selected = hero("selected", 400, 300);
    const layout = layoutFocusPresentation(selected, [
      hero("close", 458, 300)
    ]);

    const close = layout.get("close")!;
    expect(Math.hypot(close.x - selected.x, close.y - selected.y)).toBeGreaterThanOrEqual(179.5);
  });

  it("pulls excessively distant active heroes into the readable focus radius", () => {
    const selected = hero("selected", 400, 300);
    const layout = layoutFocusPresentation(selected, [
      hero("far", 1050, 300)
    ]);

    const far = layout.get("far")!;
    expect(Math.hypot(far.x - selected.x, far.y - selected.y)).toBeLessThanOrEqual(310.5);
  });

  it("keeps active heroes separated from each other", () => {
    const selected = hero("selected", 400, 300);
    const related = [
      hero("a", 500, 300),
      hero("b", 510, 305),
      hero("c", 520, 310)
    ];

    const layout = layoutFocusPresentation(selected, related);
    const points = related.map(item => layout.get(item.id)!);

    for (let left = 0; left < points.length; left += 1) {
      for (let right = left + 1; right < points.length; right += 1) {
        expect(
          Math.hypot(
            points[right].x - points[left].x,
            points[right].y - points[left].y
          )
        ).toBeGreaterThanOrEqual(110);
      }
    }
  });

  it("separates active heroes that start on the same radial spoke", () => {
    const selected = hero("selected", 400, 300);
    const layout = layoutFocusPresentation(selected, [
      hero("near", 580, 300),
      hero("far", 700, 300)
    ]);

    const near = layout.get("near")!;
    const far = layout.get("far")!;
    const nearAngle = Math.atan2(near.y - selected.y, near.x - selected.x);
    const farAngle = Math.atan2(far.y - selected.y, far.x - selected.x);
    let difference = Math.abs(farAngle - nearAngle);
    if (difference > Math.PI) difference = Math.PI * 2 - difference;

    expect(difference).toBeGreaterThanOrEqual(Math.PI / 9 - 0.02);
    expect(layout.get("selected")).toEqual({ x: 400, y: 300 });
  });

  it("preserves the original side of the selected hero", () => {
    const selected = hero("selected", 400, 300);
    const related = [
      hero("left", 250, 300),
      hero("right", 550, 300),
      hero("up", 400, 120),
      hero("down", 400, 500)
    ];

    const layout = layoutFocusPresentation(selected, related);

    expect(layout.get("left")!.x).toBeLessThan(selected.x);
    expect(layout.get("right")!.x).toBeGreaterThan(selected.x);
    expect(layout.get("up")!.y).toBeLessThan(selected.y);
    expect(layout.get("down")!.y).toBeGreaterThan(selected.y);
  });
});
