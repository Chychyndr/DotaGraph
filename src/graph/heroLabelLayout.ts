export interface HeroLabelSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface HeroLabelObstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface HeroLabelInput {
  id: string;
  x: number;
  y: number;
  radius: number;
  width: number;
  height: number;
  preferredAngle: number;
}

export interface HeroLabelPlacement {
  x: number;
  y: number;
  angle: number;
}

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const TWO_PI = Math.PI * 2;
const LABEL_GAP = 8;
const EDGE_GAP = 3;
const EXTRA_DISTANCES = [0, 18, 36, 54];

const normalizeAngle = (angle: number) => {
  const normalized = angle % TWO_PI;
  return normalized < 0 ? normalized + TWO_PI : normalized;
};

const angularDistance = (left: number, right: number) => {
  const delta = Math.abs(normalizeAngle(left) - normalizeAngle(right));
  return Math.min(delta, TWO_PI - delta);
};

const rectFor = (
  x: number,
  y: number,
  width: number,
  height: number,
  gap = 0
): Rect => ({
  left: x - width / 2 - gap,
  right: x + width / 2 + gap,
  top: y - height / 2 - gap,
  bottom: y + height / 2 + gap
});

const rectsOverlap = (left: Rect, right: Rect) =>
  left.left < right.right &&
  left.right > right.left &&
  left.top < right.bottom &&
  left.bottom > right.top;

const circleTouchesRect = (circle: HeroLabelObstacle, rect: Rect) => {
  const closestX = Math.min(rect.right, Math.max(rect.left, circle.x));
  const closestY = Math.min(rect.bottom, Math.max(rect.top, circle.y));
  return Math.hypot(circle.x - closestX, circle.y - closestY) < circle.radius;
};

const pointInsideRect = (x: number, y: number, rect: Rect) =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

const cross = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

const segmentsIntersect = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
) => {
  const abC = cross(ax, ay, bx, by, cx, cy);
  const abD = cross(ax, ay, bx, by, dx, dy);
  const cdA = cross(cx, cy, dx, dy, ax, ay);
  const cdB = cross(cx, cy, dx, dy, bx, by);
  return abC * abD <= 0 && cdA * cdB <= 0;
};

const segmentIntersectsRect = (segment: HeroLabelSegment, rect: Rect) => {
  if (
    pointInsideRect(segment.x1, segment.y1, rect) ||
    pointInsideRect(segment.x2, segment.y2, rect)
  ) {
    return true;
  }

  return (
    segmentsIntersect(
      segment.x1, segment.y1, segment.x2, segment.y2,
      rect.left, rect.top, rect.right, rect.top
    ) ||
    segmentsIntersect(
      segment.x1, segment.y1, segment.x2, segment.y2,
      rect.right, rect.top, rect.right, rect.bottom
    ) ||
    segmentsIntersect(
      segment.x1, segment.y1, segment.x2, segment.y2,
      rect.right, rect.bottom, rect.left, rect.bottom
    ) ||
    segmentsIntersect(
      segment.x1, segment.y1, segment.x2, segment.y2,
      rect.left, rect.bottom, rect.left, rect.top
    )
  );
};

const candidateAngles = (preferredAngle: number) =>
  Array.from({ length: 16 }, (_, index) => index * TWO_PI / 16)
    .sort(
      (left, right) =>
        angularDistance(left, preferredAngle) -
          angularDistance(right, preferredAngle) ||
        left - right
    );

export function layoutHeroLabels(
  inputs: HeroLabelInput[],
  segments: HeroLabelSegment[],
  obstacles: HeroLabelObstacle[]
) {
  const placements = new Map<string, HeroLabelPlacement>();
  const placedRects: Rect[] = [];

  for (const input of inputs) {
    let best:
      | {
          placement: HeroLabelPlacement;
          rect: Rect;
          score: number;
        }
      | undefined;

    const halfWidth = input.width / 2;
    const halfHeight = input.height / 2;

    for (const angle of candidateAngles(input.preferredAngle)) {
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const baseDistance =
        input.radius +
        LABEL_GAP +
        Math.abs(ux) * halfWidth +
        Math.abs(uy) * halfHeight;

      for (const extraDistance of EXTRA_DISTANCES) {
        const distance = baseDistance + extraDistance;
        const x = input.x + ux * distance;
        const y = input.y + uy * distance;
        const rect = rectFor(x, y, input.width, input.height, EDGE_GAP);

        const edgeHits = segments.reduce(
          (count, segment) =>
            count + (segmentIntersectsRect(segment, rect) ? 1 : 0),
          0
        );
        const portraitHits = obstacles.reduce(
          (count, obstacle) =>
            obstacle.id === input.id || !circleTouchesRect(obstacle, rect)
              ? count
              : count + 1,
          0
        );
        const labelHits = placedRects.reduce(
          (count, placed) => count + (rectsOverlap(placed, rect) ? 1 : 0),
          0
        );

        const score =
          edgeHits * 100_000 +
          portraitHits * 100_000 +
          labelHits * 100_000 +
          angularDistance(angle, input.preferredAngle) * 100 +
          extraDistance;

        if (!best || score < best.score) {
          best = {
            placement: { x, y, angle },
            rect,
            score
          };
        }
      }
    }

    if (!best) continue;
    placements.set(input.id, best.placement);
    placedRects.push(best.rect);
  }

  return placements;
}
