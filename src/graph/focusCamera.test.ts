import { describe, expect, it } from "vitest";
import { calculateFocusScale, visibleViewBoxForViewport } from "./focusCamera";

describe("calculateFocusScale", () => {
  it("keeps close relationships at the normal focus scale", () => {
    expect(calculateFocusScale(
      { x: 600, y: 380 },
      [{ x: 720, y: 430 }, { x: 510, y: 300 }],
      { width: 1200, height: 760 }
    )).toBe(1.04);
  });

  it("zooms out enough for a distant relationship while keeping the selected hero centered", () => {
    const scale = calculateFocusScale(
      { x: 520, y: 620 },
      [{ x: 515, y: 160 }, { x: 600, y: 380 }],
      { width: 1200, height: 760 }
    );

    expect(scale).toBeCloseTo(312 / 460, 3);
    expect(scale).toBeLessThan(0.7);
  });

  it("respects the compact upward focus offset", () => {
    const scale = calculateFocusScale(
      { x: 500, y: 500 },
      [{ x: 500, y: 100 }],
      {
        width: 420,
        height: 760,
        offsetY: -120,
        paddingX: 60,
        paddingY: 54
      }
    );

    expect(scale).toBe(0.55);
  });

  it("never zooms farther than the configured minimum", () => {
    expect(calculateFocusScale(
      { x: 0, y: 0 },
      [{ x: 5000, y: 5000 }],
      { width: 1200, height: 760 }
    )).toBe(0.55);
  });
});

describe("visibleViewBoxForViewport", () => {
  it("keeps the complete viewBox in meet mode", () => {
    expect(visibleViewBoxForViewport(1920, 900, 1200, 760, "meet")).toEqual({
      width: 1200,
      height: 760
    });
  });

  it("returns the cropped graph span in compact slice mode", () => {
    const visible = visibleViewBoxForViewport(390, 750, 1200, 760, "slice");

    expect(visible.height).toBeCloseTo(760);
    expect(visible.width).toBeCloseTo(395.2, 1);
  });
});
