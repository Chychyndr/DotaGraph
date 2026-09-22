export interface EdgeRoutePoint {
  x: number;
  y: number;
}

export interface EdgeRouteObstacle extends EdgeRoutePoint {
  id: string;
  radius: number;
}

export interface EdgeRoute {
  points: EdgeRoutePoint[];
  detoured: boolean;
  blockers: string[];
}

export interface EdgeRouteSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const DEFAULT_CLEARANCE = 5;
const OFFSET_STEPS = [28, 38, 50, 64, 80, 98, 118, 140, 180, 240];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const distance = (left: EdgeRoutePoint, right: EdgeRoutePoint) =>
  Math.hypot(right.x - left.x, right.y - left.y);

const projectionT = (
  point: EdgeRoutePoint,
  start: EdgeRoutePoint,
  end: EdgeRoutePoint
) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return 0;

  return (
    ((point.x - start.x) * dx + (point.y - start.y) * dy) /
    lengthSquared
  );
};

export const distanceToSegment = (
  point: EdgeRoutePoint,
  start: EdgeRoutePoint,
  end: EdgeRoutePoint
) => {
  const t = clamp(projectionT(point, start, end), 0, 1);
  const x = start.x + (end.x - start.x) * t;
  const y = start.y + (end.y - start.y) * t;
  return Math.hypot(point.x - x, point.y - y);
};

const segmentIsClear = (
  start: EdgeRoutePoint,
  end: EdgeRoutePoint,
  obstacles: EdgeRouteObstacle[],
  clearance: number
) =>
  obstacles.every(
    (obstacle) =>
      distanceToSegment(obstacle, start, end) >= obstacle.radius + clearance
  );

export const routeSegments = (route: EdgeRoute): EdgeRouteSegment[] =>
  route.points.slice(1).map((point, index) => ({
    x1: route.points[index].x,
    y1: route.points[index].y,
    x2: point.x,
    y2: point.y
  }));

const routeIsClear = (
  points: EdgeRoutePoint[],
  obstacles: EdgeRouteObstacle[],
  clearance: number
) =>
  points
    .slice(1)
    .every((point, index) =>
      segmentIsClear(points[index], point, obstacles, clearance)
    );

const routeLength = (points: EdgeRoutePoint[]) =>
  points
    .slice(1)
    .reduce((total, point, index) => total + distance(points[index], point), 0);

const blockingObstacles = (
  start: EdgeRoutePoint,
  end: EdgeRoutePoint,
  obstacles: EdgeRouteObstacle[],
  clearance: number
) =>
  obstacles
    .filter(
      (obstacle) =>
        distanceToSegment(obstacle, start, end) < obstacle.radius + clearance
    )
    .map((obstacle) => ({
      obstacle,
      t: clamp(projectionT(obstacle, start, end), 0, 1)
    }))
    .sort((left, right) => left.t - right.t || left.obstacle.id.localeCompare(right.obstacle.id));

const uniqueTs = (values: number[]) =>
  [...new Set(values.map((value) => clamp(value, 0.12, 0.88).toFixed(4)))]
    .map(Number);

export function routeEdgeAroundObstacles(
  start: EdgeRoutePoint,
  end: EdgeRoutePoint,
  obstacles: EdgeRouteObstacle[],
  clearance = DEFAULT_CLEARANCE
): EdgeRoute {
  const blockers = blockingObstacles(start, end, obstacles, clearance);
  if (!blockers.length) {
    return {
      points: [start, end],
      detoured: false,
      blockers: []
    };
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const blockerTs = blockers.map(({ t }) => t);
  const minT = Math.min(...blockerTs);
  const maxT = Math.max(...blockerTs);
  const averageT =
    blockerTs.reduce((sum, value) => sum + value, 0) / blockerTs.length;
  const centerT = (minT + maxT) / 2;
  const candidateTs = uniqueTs([
    averageT,
    centerT,
    ...blockerTs,
    0.5
  ]).sort(
    (left, right) =>
      Math.abs(left - averageT) - Math.abs(right - averageT) || left - right
  );

  let best:
    | {
        points: EdgeRoutePoint[];
        score: number;
      }
    | undefined;

  const consider = (points: EdgeRoutePoint[], scoreBias: number) => {
    if (!routeIsClear(points, obstacles, clearance)) return;
    const score = routeLength(points) + scoreBias;
    if (!best || score < best.score) {
      best = { points, score };
    }
  };

  for (const offset of OFFSET_STEPS) {
    for (const side of [1, -1]) {
      for (const t of candidateTs) {
        const base = {
          x: start.x + dx * t,
          y: start.y + dy * t
        };
        const waypoint = {
          x: base.x + nx * offset * side,
          y: base.y + ny * offset * side
        };
        consider(
          [start, waypoint, end],
          offset * 0.1 + (side < 0 ? 0.01 : 0)
        );
      }

      const beforeT = clamp(minT - 0.08, 0.1, 0.78);
      const afterT = clamp(maxT + 0.08, 0.22, 0.9);
      const before = {
        x: start.x + dx * beforeT + nx * offset,
        y: start.y + dy * beforeT + ny * offset
      };
      const after = {
        x: start.x + dx * afterT + nx * offset,
        y: start.y + dy * afterT + ny * offset
      };
      consider([start, before, after, end], offset * 0.1 + 2);

      const beforeMirror = {
        x: start.x + dx * beforeT - nx * offset,
        y: start.y + dy * beforeT - ny * offset
      };
      const afterMirror = {
        x: start.x + dx * afterT - nx * offset,
        y: start.y + dy * afterT - ny * offset
      };
      consider([start, beforeMirror, afterMirror, end], offset * 0.1 + 2.01);
    }
  }

  if (!best) {
    for (const offset of [80, 120, 180, 240, 320, 440]) {
      for (const side of [1, -1]) {
        const shiftedStart = {
          x: start.x + nx * offset * side,
          y: start.y + ny * offset * side
        };
        const shiftedEnd = {
          x: end.x + nx * offset * side,
          y: end.y + ny * offset * side
        };
        consider(
          [start, shiftedStart, shiftedEnd, end],
          offset * 0.2 + (side < 0 ? 0.01 : 0)
        );
      }

      if (best) break;
    }
  }

  if (!best) {
    const fallbackOffset = OFFSET_STEPS[OFFSET_STEPS.length - 1];
    const t = clamp(averageT, 0.12, 0.88);
    const base = {
      x: start.x + dx * t,
      y: start.y + dy * t
    };
    best = {
      points: [
        start,
        {
          x: base.x + nx * fallbackOffset,
          y: base.y + ny * fallbackOffset
        },
        end
      ],
      score: Number.POSITIVE_INFINITY
    };
  }

  return {
    points: best.points,
    detoured: true,
    blockers: blockers.map(({ obstacle }) => obstacle.id)
  };
}
