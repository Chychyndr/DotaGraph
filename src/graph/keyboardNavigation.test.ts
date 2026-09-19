import { describe, expect, it } from "vitest";
import type { Hero } from "../domain/types";
import { findHeroInDirection, findNearestHeroToPoint } from "./keyboardNavigation";

const hero = (id: string, x: number, y: number): Hero => ({
  id,
  slug: id,
  name: id,
  aliases: [],
  spriteIndex: 0,
  x,
  y
});

const heroes = [
  hero("center", 100, 100),
  hero("left", 20, 100),
  hero("right", 180, 100),
  hero("up", 100, 20),
  hero("down", 100, 180),
  hero("diagonal", 150, 140)
];

describe("findHeroInDirection", () => {
  it("moves to the closest spatial candidate in each arrow direction", () => {
    expect(findHeroInDirection("center", "ArrowLeft", heroes)?.id).toBe("left");
    expect(findHeroInDirection("center", "ArrowRight", heroes)?.id).toBe("right");
    expect(findHeroInDirection("center", "ArrowUp", heroes)?.id).toBe("up");
    expect(findHeroInDirection("center", "ArrowDown", heroes)?.id).toBe("down");
  });

  it("ignores candidates behind the requested direction", () => {
    expect(findHeroInDirection("right", "ArrowRight", heroes)).toBeUndefined();
  });

  it("returns undefined for an unknown current hero", () => {
    expect(findHeroInDirection("missing", "ArrowRight", heroes)).toBeUndefined();
  });
});


describe("findNearestHeroToPoint", () => {
  it("returns the hero closest to the requested point", () => {
    expect(findNearestHeroToPoint(heroes, 105, 95)?.id).toBe("center");
    expect(findNearestHeroToPoint(heroes, 175, 105)?.id).toBe("right");
  });

  it("returns undefined for an empty roster", () => {
    expect(findNearestHeroToPoint([], 0, 0)).toBeUndefined();
  });
});
