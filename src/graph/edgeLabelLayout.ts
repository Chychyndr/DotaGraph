export interface EdgeSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface EdgeLabelInput {
  id: string;
  segment: EdgeSegment;
  segments?: EdgeSegment[];
  preferredT?: number;
  source?: EdgeLabelObstacle;
}

export interface EdgeLabelObstacle {
  x: number;
  y: number;
  radius: number;
}

export interface EdgeLabelRectObstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeLabelPlacement {
  x: number;
  y: number;
  t: number;
  offset: number;
  scale: number;
  leader?: EdgeSegment;
}

export interface EdgeLabelBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface EdgeLabelLayoutOptions {
  sizeScale?: number;
  bounds?: EdgeLabelBounds;
}

export const EDGE_LABEL_WIDTH = 46;
export const EDGE_LABEL_HEIGHT = 18;

const LABEL_GAP = 2;
const MIN_T = 0.12;
const MAX_T = 0.88;
const PREFERRED_T = 0.34;
const MIN_LABEL_SCALE = 0.8;

const safeEndMargin = (scale: number) =>
  Math.hypot(
    EDGE_LABEL_WIDTH * scale / 2 + LABEL_GAP,
    EDGE_LABEL_HEIGHT * scale / 2 + LABEL_GAP
  );

const scaleForLength = (length: number, sizeScale: number) => {
  const minimumScale = MIN_LABEL_SCALE * sizeScale;
  for (
    let scale = sizeScale;
    scale >= minimumScale;
    scale -= 0.05 * sizeScale
  ) {
    if (safeEndMargin(scale) * 2 <= length) return scale;
  }
  return minimumScale;
};

const segmentsFor = (input: EdgeLabelInput) =>
  input.segments?.length ? input.segments : [input.segment];

const pathLength = (segments: EdgeSegment[]) =>
  segments.reduce(
    (total, segment) =>
      total + Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1),
    0
  );

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const rectFor = (x: number, y: number, scale = 1, gap = 0): Rect => ({
  left: x - EDGE_LABEL_WIDTH * scale / 2 - gap,
  right: x + EDGE_LABEL_WIDTH * scale / 2 + gap,
  top: y - EDGE_LABEL_HEIGHT * scale / 2 - gap,
  bottom: y + EDGE_LABEL_HEIGHT * scale / 2 + gap
});

const rectanglesOverlap = (a: Rect, b: Rect) =>
  a.left < b.right &&
  a.right > b.left &&
  a.top < b.bottom &&
  a.bottom > b.top;

const rectWithinBounds = (rect: Rect, bounds: EdgeLabelBounds) =>
  rect.left >= bounds.left &&
  rect.right <= bounds.right &&
  rect.top >= bounds.top &&
  rect.bottom <= bounds.bottom;

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

const rectObstacleFor = (obstacle: EdgeLabelRectObstacle): Rect => ({
  left: obstacle.x - obstacle.width / 2,
  right: obstacle.x + obstacle.width / 2,
  top: obstacle.y - obstacle.height / 2,
  bottom: obstacle.y + obstacle.height / 2
});

const candidateFor = (
  segment: EdgeSegment,
  t: number,
  normalOffset: number,
  scale: number
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
    offset: normalOffset,
    scale
  };
};

const candidateForPath = (
  segments: EdgeSegment[],
  t: number,
  scale: number
): EdgeLabelPlacement => {
  const totalLength = pathLength(segments) || 1;
  let remaining = clamp(t, 0, 1) * totalLength;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const length = Math.hypot(
      segment.x2 - segment.x1,
      segment.y2 - segment.y1
    );

    if (remaining <= length || index === segments.length - 1) {
      const localT = length > 0 ? clamp(remaining / length, 0, 1) : 0;
      return {
        ...candidateFor(segment, localT, 0, scale),
        t
      };
    }

    remaining -= length;
  }

  return {
    ...candidateFor(segments[segments.length - 1], 1, 0, scale),
    t
  };
};

const candidateScore = (
  placement: EdgeLabelPlacement,
  placedRects: Rect[],
  obstacles: EdgeLabelObstacle[],
  rectObstacles: EdgeLabelRectObstacle[],
  bounds: EdgeLabelBounds | undefined,
  preferenceIndex: number,
  preferredT: number
) => {
  const paddedRect = rectFor(
    placement.x,
    placement.y,
    placement.scale,
    LABEL_GAP
  );

  if (bounds && !rectWithinBounds(paddedRect, bounds)) {
    return Number.POSITIVE_INFINITY;
  }

  let score =
    Math.abs(placement.t - preferredT) * 40 +
    preferenceIndex * 0.05 +
    Math.abs(placement.offset) * 0.25 +
    (1 - placement.scale) * 120;

  for (const placed of placedRects) {
    if (!rectanglesOverlap(paddedRect, placed)) continue;
    score += 10_000 + rectangleOverlapArea(paddedRect, placed) * 20;
  }

  for (const obstacle of obstacles) {
    if (circleTouchesRect(obstacle, paddedRect)) score += 5_000;
  }

  for (const obstacle of rectObstacles) {
    if (rectanglesOverlap(paddedRect, rectObstacleFor(obstacle))) {
      return Number.POSITIVE_INFINITY;
    }
  }

  return score;
};

export function layoutSourceAnchoredEdgeLabels(
  inputs: EdgeLabelInput[],
  obstacles: EdgeLabelObstacle[],
  rectObstacles: EdgeLabelRectObstacle[] = [],
  options: EdgeLabelLayoutOptions = {}
) {
  const sizeScale = clamp(options.sizeScale ?? 1, 0.7, 1);
  const minimumScale = MIN_LABEL_SCALE * sizeScale;
  const placements = new Map<string, EdgeLabelPlacement>();
  const placedRects: Rect[] = [];
  const orderedInputs = [...inputs].sort((a, b) => {
    const aLength = pathLength(segmentsFor(a));
    const bLength = pathLength(segmentsFor(b));
    return aLength - bLength || a.id.localeCompare(b.id);
  });

  for (const input of orderedInputs) {
    const segments = segmentsFor(input);
    const segment = segments[0];
    const length = pathLength(segments) || 1;
    const scale = scaleForLength(length, sizeScale);
    const margin = safeEndMargin(scale);
    const safeMinT = clamp(margin / length, MIN_T, 0.46);
    const safeMaxT = clamp(1 - margin / length, 0.54, MAX_T);
    const preferredT = clamp(input.preferredT ?? PREFERRED_T, safeMinT, safeMaxT);
    const step = 0.04;
    const sampledTs: number[] = [];

    for (let t = safeMinT; t <= safeMaxT + 0.0001; t += step) {
      sampledTs.push(t);
    }
    sampledTs.push(safeMinT, safeMaxT, preferredT);

    const uniqueTs = [...new Set(sampledTs.map((value) => value.toFixed(4)))]
      .map(Number)
      .sort(
        (a, b) =>
          Math.abs(a - preferredT) - Math.abs(b - preferredT) ||
          a - b
      );

    const candidateScales = [...new Set([
      scale,
      Math.max(
        minimumScale,
        Number((scale - 0.1 * sizeScale).toFixed(3))
      ),
      minimumScale
    ])];

    const candidates = candidateScales.flatMap((candidateScale) =>
      uniqueTs.map((t) => candidateForPath(segments, t, candidateScale))
    );

    let best = candidates[0];
    let bestScore = Number.POSITIVE_INFINITY;

    candidates.forEach((candidate, index) => {
      const score = candidateScore(
        candidate,
        placedRects,
        obstacles,
        rectObstacles,
        options.bounds,
        index,
        preferredT
      );
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    });

    if (bestScore >= 5_000 && input.source) {
      const dx = segment.x2 - segment.x1;
      const dy = segment.y2 - segment.y1;
      const segmentLength = Math.hypot(dx, dy) || 1;
      const ux = dx / segmentLength;
      const uy = dy / segmentLength;
      const outwardX = -ux;
      const outwardY = -uy;
      const extraDistances = [
        0, 12, 24, 36, 48, 60, 72, 90, 108, 126, 144
      ];

      candidateScales.forEach((externalScale, scaleIndex) => {
        const support =
          Math.abs(outwardX) * EDGE_LABEL_WIDTH * externalScale / 2 +
          Math.abs(outwardY) * EDGE_LABEL_HEIGHT * externalScale / 2;
        const sourceEdge = {
          x: segment.x1,
          y: segment.y1
        };

        extraDistances.forEach((extraDistance, distanceIndex) => {
          const distance = support + LABEL_GAP + extraDistance;
          const x = sourceEdge.x + outwardX * distance;
          const y = sourceEdge.y + outwardY * distance;
          const t =
            ((x - segment.x1) * dx + (y - segment.y1) * dy) /
            (segmentLength * segmentLength);
          const candidate: EdgeLabelPlacement = {
            x,
            y,
            t,
            offset: 0,
            scale: externalScale,
            leader: {
              x1: sourceEdge.x,
              y1: sourceEdge.y,
              x2: x - outwardX * (support + 1),
              y2: y - outwardY * (support + 1)
            }
          };
          const score =
            candidateScore(
              candidate,
              placedRects,
              obstacles,
              rectObstacles,
              options.bounds,
              candidates.length + scaleIndex * extraDistances.length + distanceIndex,
              t
            ) + 150;

          if (score < bestScore) {
            best = candidate;
            bestScore = score;
          }
        });
      });
    }

    if (options.bounds && !Number.isFinite(bestScore)) {
      const halfWidth = EDGE_LABEL_WIDTH * best.scale / 2 + LABEL_GAP;
      const halfHeight = EDGE_LABEL_HEIGHT * best.scale / 2 + LABEL_GAP;
      const minX = options.bounds.left + halfWidth;
      const maxX = options.bounds.right - halfWidth;
      const minY = options.bounds.top + halfHeight;
      const maxY = options.bounds.bottom - halfHeight;

      if (minX <= maxX && minY <= maxY) {
        const x = clamp(best.x, minX, maxX);
        const y = clamp(best.y, minY, maxY);
        const dx = x - best.x;
        const dy = y - best.y;

        best = {
          ...best,
          x,
          y,
          leader: best.leader
            ? {
                ...best.leader,
                x2: best.leader.x2 + dx,
                y2: best.leader.y2 + dy
              }
            : undefined
        };
      }
    }

    placements.set(input.id, best);
    placedRects.push(rectFor(best.x, best.y, best.scale, LABEL_GAP));
  }

  return placements;
}

export function edgeLabelRectsOverlap(
  a: EdgeLabelPlacement,
  b: EdgeLabelPlacement
) {
  return rectanglesOverlap(
    rectFor(a.x, a.y, a.scale, LABEL_GAP),
    rectFor(b.x, b.y, b.scale, LABEL_GAP)
  );
}
