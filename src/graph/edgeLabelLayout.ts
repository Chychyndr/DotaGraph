export interface EdgeSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface EdgeLabelInput {
  id: string;
  segment: EdgeSegment;
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

export const EDGE_LABEL_WIDTH = 46;
export const EDGE_LABEL_HEIGHT = 18;

const LABEL_GAP = 2;
const MIN_T = 0.12;
const MAX_T = 0.88;
const PREFERRED_T = 0.34;
const NORMAL_OFFSETS = [0];
const MIN_LABEL_SCALE = 0.8;

const safeEndMargin = (scale: number) =>
  Math.hypot(
    EDGE_LABEL_WIDTH * scale / 2 + LABEL_GAP,
    EDGE_LABEL_HEIGHT * scale / 2 + LABEL_GAP
  );

const scaleForLength = (length: number) => {
  for (let scale = 1; scale >= MIN_LABEL_SCALE; scale -= 0.05) {
    if (safeEndMargin(scale) * 2 <= length) return scale;
  }
  return MIN_LABEL_SCALE;
};

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

const candidateScore = (
  placement: EdgeLabelPlacement,
  placedRects: Rect[],
  obstacles: EdgeLabelObstacle[],
  rectObstacles: EdgeLabelRectObstacle[],
  preferenceIndex: number,
  preferredT: number
) => {
  const paddedRect = rectFor(
    placement.x,
    placement.y,
    placement.scale,
    LABEL_GAP
  );

  let score =
    Math.abs(placement.t - preferredT) * 40 +
    preferenceIndex * 0.05 +
    Math.abs(placement.offset) * 0.25;

  for (const placed of placedRects) {
    if (!rectanglesOverlap(paddedRect, placed)) continue;
    score += 10_000 + rectangleOverlapArea(paddedRect, placed) * 20;
  }

  for (const obstacle of obstacles) {
    if (circleTouchesRect(obstacle, paddedRect)) score += 5_000;
  }

  for (const obstacle of rectObstacles) {
    if (rectanglesOverlap(paddedRect, rectObstacleFor(obstacle))) {
      score += 20_000;
    }
  }

  return score;
};

export function layoutSourceAnchoredEdgeLabels(
  inputs: EdgeLabelInput[],
  obstacles: EdgeLabelObstacle[],
  rectObstacles: EdgeLabelRectObstacle[] = []
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
    const scale = scaleForLength(length);
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

    const candidates = uniqueTs.flatMap((t) =>
      NORMAL_OFFSETS.map((offset) => candidateFor(segment, t, offset, scale))
    );

    let best = candidates[0];
    let bestScore = Number.POSITIVE_INFINITY;

    candidates.forEach((candidate, index) => {
      const score = candidateScore(
        candidate,
        placedRects,
        obstacles,
        rectObstacles,
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
      const externalScale = 1;
      const angleOffsets = [0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75];
      const extraDistances = [0, 18, 36, 54, 72, 96, 120, 150, 180, 220];

      angleOffsets.forEach((angleDegrees, angleIndex) => {
        const angle = angleDegrees * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const outwardX = -ux * cos + uy * sin;
        const outwardY = -ux * sin - uy * cos;
        const support =
          Math.abs(outwardX) * EDGE_LABEL_WIDTH * externalScale / 2 +
          Math.abs(outwardY) * EDGE_LABEL_HEIGHT * externalScale / 2;
        const sourceEdge = {
          x: input.source!.x + outwardX * (input.source!.radius + LABEL_GAP),
          y: input.source!.y + outwardY * (input.source!.radius + LABEL_GAP)
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
              candidates.length + angleIndex * extraDistances.length + distanceIndex,
              t
            ) +
            150 +
            Math.abs(angleDegrees) * 0.8;

          if (score < bestScore) {
            best = candidate;
            bestScore = score;
          }
        });
      });
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
