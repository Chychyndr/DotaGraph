export interface EdgeSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface EdgeLabelInput {
  id: string;
  segment: EdgeSegment;
}

export interface EdgeLabelObstacle {
  x: number;
  y: number;
  radius: number;
}

export interface EdgeLabelPlacement {
  x: number;
  y: number;
  t: number;
  offset: number;
}

export const EDGE_LABEL_WIDTH = 46;
export const EDGE_LABEL_HEIGHT = 18;

const LABEL_GAP = 5;
const MIN_T = 0.12;
const MAX_T = 0.88;
const PREFERRED_T = 0.34;
const NORMAL_OFFSETS = [0];
const SAFE_END_MARGIN = Math.hypot(
  EDGE_LABEL_WIDTH / 2 + LABEL_GAP,
  EDGE_LABEL_HEIGHT / 2 + LABEL_GAP
);

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const rectFor = (x: number, y: number, gap = 0): Rect => ({
  left: x - EDGE_LABEL_WIDTH / 2 - gap,
  right: x + EDGE_LABEL_WIDTH / 2 + gap,
  top: y - EDGE_LABEL_HEIGHT / 2 - gap,
  bottom: y + EDGE_LABEL_HEIGHT / 2 + gap
});

const rectanglesOverlap = (a: Rect, b: Rect) =>
  a.left < b.right &&
  a.right > b.left &&
  a.top < b.bottom &&
  a.bottom > b.top;

const rectangleOverlapArea = (a: Rect, b: Rect) => {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return width > 0 && height > 0 ? width * height : 0;
};

const circleTouchesRect = (obstacle: EdgeLabelObstacle, rect: Rect) => {
  const closestX = clamp(obstacle.x, rect.left, rect.right);
  const closestY = clamp(obstacle.y, rect.top, rect.bottom);
  return Math.hypot(obstacle.x - closestX, obstacle.y - closestY) < obstacle.radius;
};

const candidateFor = (
  segment: EdgeSegment,
  t: number,
  normalOffset: number
): EdgeLabelPlacement => {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;

  return {
    x: segment.x1 + dx * t + nx * normalOffset,
    y: segment.y1 + dy * t + ny * normalOffset,
    t,
    offset: normalOffset
  };
};

const candidateScore = (
  placement: EdgeLabelPlacement,
  placedRects: Rect[],
  obstacles: EdgeLabelObstacle[],
  preferenceIndex: number
) => {
  const paddedRect = rectFor(placement.x, placement.y, LABEL_GAP);

  let score =
    Math.abs(placement.t - PREFERRED_T) * 40 +
    preferenceIndex * 0.05 +
    Math.abs(placement.offset) * 0.25;

  for (const placed of placedRects) {
    if (!rectanglesOverlap(paddedRect, placed)) continue;
    score += 10_000 + rectangleOverlapArea(paddedRect, placed) * 20;
  }

  for (const obstacle of obstacles) {
    if (circleTouchesRect(obstacle, paddedRect)) score += 5_000;
  }

  return score;
};

export function layoutSourceAnchoredEdgeLabels(
  inputs: EdgeLabelInput[],
  obstacles: EdgeLabelObstacle[]
) {
  const placements = new Map<string, EdgeLabelPlacement>();
  const placedRects: Rect[] = [];
  const orderedInputs = [...inputs].sort((a, b) => {
    const aLength = Math.hypot(
      a.segment.x2 - a.segment.x1,
      a.segment.y2 - a.segment.y1
    );
    const bLength = Math.hypot(
      b.segment.x2 - b.segment.x1,
      b.segment.y2 - b.segment.y1
    );
    return aLength - bLength || a.id.localeCompare(b.id);
  });

  for (const input of orderedInputs) {
    const { segment } = input;
    const length = Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1) || 1;
    const safeMinT = clamp(SAFE_END_MARGIN / length, MIN_T, 0.46);
    const safeMaxT = clamp(1 - SAFE_END_MARGIN / length, 0.54, MAX_T);
    const step = 0.04;
    const sampledTs: number[] = [];

    for (let t = safeMinT; t <= safeMaxT + 0.0001; t += step) {
      sampledTs.push(t);
    }
    sampledTs.push(safeMinT, safeMaxT, clamp(PREFERRED_T, safeMinT, safeMaxT));

    const uniqueTs = [...new Set(sampledTs.map((value) => value.toFixed(4)))]
      .map(Number)
      .sort(
        (a, b) =>
          Math.abs(a - PREFERRED_T) - Math.abs(b - PREFERRED_T) ||
          a - b
      );

    const candidates = uniqueTs.flatMap((t) =>
      NORMAL_OFFSETS.map((offset) => candidateFor(segment, t, offset))
    );

    let best = candidates[0];
    let bestScore = Number.POSITIVE_INFINITY;

    candidates.forEach((candidate, index) => {
      const score = candidateScore(candidate, placedRects, obstacles, index);
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    });

    placements.set(input.id, best);
    placedRects.push(rectFor(best.x, best.y, LABEL_GAP));
  }

  return placements;
}

export function edgeLabelRectsOverlap(
  a: EdgeLabelPlacement,
  b: EdgeLabelPlacement
) {
  return rectanglesOverlap(
    rectFor(a.x, a.y, LABEL_GAP),
    rectFor(b.x, b.y, LABEL_GAP)
  );
}
