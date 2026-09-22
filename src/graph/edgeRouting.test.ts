import { describe, expect, it } from "vitest";
import {
  distanceToSegment,
  routeEdgeAroundObstacles,
  routeSegments
} from "./edgeRouting";

describe("routeEdgeAroundObstacles", () => {
  it("keeps a clear relationship straight", () => {
    const route = routeEdgeAroundObstacles(
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      [{ id: "far", x: 100, y: 80, radius: 20 }]
    );

    expect(route.detoured).toBe(false);
    expect(route.points).toEqual([
      { x: 0, y: 0 },
      { x: 200, y: 0 }
    ]);
  });

  it("detours around a blocking portrait", () => {
    const obstacle = { id: "blocked", x: 100, y: 0, radius: 20 };
    const route = routeEdgeAroundObstacles(
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      [obstacle]
    );

    expect(route.detoured).toBe(true);
    expect(route.blockers).toEqual(["blocked"]);
    expect(route.points.length).toBeGreaterThan(2);

    for (const segment of routeSegments(route)) {
      expect(
        distanceToSegment(
          obstacle,
          { x: segment.x1, y: segment.y1 },
          { x: segment.x2, y: segment.y2 }
        )
      ).toBeGreaterThanOrEqual(25);
    }
  });

  it("clears multiple portraits on one relationship", () => {
    const obstacles = [
      { id: "first", x: 80, y: 0, radius: 20 },
      { id: "second", x: 140, y: 0, radius: 20 }
    ];
    const route = routeEdgeAroundObstacles(
      { x: 0, y: 0 },
      { x: 220, y: 0 },
      obstacles
    );

    expect(route.detoured).toBe(true);
    for (const segment of routeSegments(route)) {
      for (const obstacle of obstacles) {
        expect(
          distanceToSegment(
            obstacle,
            { x: segment.x1, y: segment.y1 },
            { x: segment.x2, y: segment.y2 }
          )
        ).toBeGreaterThanOrEqual(25);
      }
    }
  });

  it("finds a safe outer detour through a dense obstacle corridor", () => {
    const obstacles = [
      { id: "near-start", x: 45, y: 0, radius: 24 },
      { id: "middle", x: 100, y: 0, radius: 24 },
      { id: "near-end", x: 155, y: 0, radius: 24 },
      { id: "upper", x: 100, y: 38, radius: 24 }
    ];
    const route = routeEdgeAroundObstacles(
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      obstacles
    );

    expect(route.detoured).toBe(true);
    for (const segment of routeSegments(route)) {
      for (const obstacle of obstacles) {
        expect(
          distanceToSegment(
            obstacle,
            { x: segment.x1, y: segment.y1 },
            { x: segment.x2, y: segment.y2 }
          )
        ).toBeGreaterThanOrEqual(29);
      }
    }
  });

  it("is deterministic", () => {
    const obstacles = [
      { id: "first", x: 80, y: 0, radius: 20 },
      { id: "second", x: 140, y: 0, radius: 20 }
    ];

    expect(
      routeEdgeAroundObstacles(
        { x: 0, y: 0 },
        { x: 220, y: 0 },
        obstacles
      )
    ).toEqual(
      routeEdgeAroundObstacles(
        { x: 0, y: 0 },
        { x: 220, y: 0 },
        obstacles
      )
    );
  });
});
