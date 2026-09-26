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
  ignoredObstacleIds?: string[];
}

export interface EdgeLabelObstacle {
  id?: string;
  x: number;
  y: number;
  radius: number;
}

export interface EdgeLabelRectObstacle {
  id?: string;
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
  preferredT: number,
  ignoredObstacleIds: Set<string>
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
    if (obstacle.id && ignoredObstacleIds.has(obstacle.id)) continue;
    if (circleTouchesRect(obstacle, paddedRect)) score += 5_000;
  }

  for (const obstacle of rectObstacles) {
    if (obstacle.id && ignoredObstacleIds.has(obstacle.id)) continue;
    if (rectanglesOverlap(paddedRect, rectObstacleFor(obstacle))) {
      score += 20_000;
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
  const beamWidth = 160;
  const candidateLimit = 220;

  const candidateSets = inputs.map((input) => {
    const segments = segmentsFor(input);
    const segment = segments[0];
    const length = pathLength(segments) || 1;
    const scale = scaleForLength(length, sizeScale);
    const margin = safeEndMargin(scale);
    const safeMinT = clamp(margin / length, MIN_T, 0.46);
    const safeMaxT = clamp(1 - margin / length, 0.54, MAX_T);
    const preferredT = clamp(
      input.preferredT ?? PREFERRED_T,
      safeMinT,
      safeMaxT
    );
    const step = 0.02;
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

    const rawCandidates: Array<{
      placement: EdgeLabelPlacement;
      extraPenalty: number;
    }> = [];

    for (const candidateScale of candidateScales) {
      for (const t of uniqueTs) {
        rawCandidates.push({
          placement: candidateForPath(segments, t, candidateScale),
          extraPenalty: 0
        });
      }
    }

    if (sizeScale >= 1) {
      const emergencyScale = 0.7;
      for (const t of uniqueTs) {
        rawCandidates.push({
          placement: candidateForPath(segments, t, emergencyScale),
          extraPenalty: 25
        });
      }
    }

    if (input.source) {
      const extraDistances = [
        0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120
      ];
      const targetSegment = segments[segments.length - 1];
      const totalLength = pathLength(segments) || 1;

      const addExternalCandidates = (
        edge: { x: number; y: number },
        directionX: number,
        directionY: number,
        tForDistance: (distance: number) => number,
        basePenalty: number
      ) => {
        candidateScales.forEach((externalScale) => {
          const support =
            Math.abs(directionX) * EDGE_LABEL_WIDTH * externalScale / 2 +
            Math.abs(directionY) * EDGE_LABEL_HEIGHT * externalScale / 2;

          extraDistances.forEach((extraDistance) => {
            const distance = support + LABEL_GAP + extraDistance;
            const x = edge.x + directionX * distance;
            const y = edge.y + directionY * distance;

            rawCandidates.push({
              placement: {
                x,
                y,
                t: tForDistance(distance),
                offset: 0,
                scale: externalScale,
                leader: {
                  x1: edge.x,
                  y1: edge.y,
                  x2: x - directionX * (support + 1),
                  y2: y - directionY * (support + 1)
                }
              },
              extraPenalty: basePenalty + extraDistance * 1.5
            });
          });
        });
      };

      const sourceDx = segment.x2 - segment.x1;
      const sourceDy = segment.y2 - segment.y1;
      const sourceLength = Math.hypot(sourceDx, sourceDy) || 1;
      addExternalCandidates(
        { x: segment.x1, y: segment.y1 },
        -sourceDx / sourceLength,
        -sourceDy / sourceLength,
        (distance) => -distance / totalLength,
        150
      );

      const targetDx = targetSegment.x2 - targetSegment.x1;
      const targetDy = targetSegment.y2 - targetSegment.y1;
      const targetLength = Math.hypot(targetDx, targetDy) || 1;
      addExternalCandidates(
        { x: targetSegment.x2, y: targetSegment.y2 },
        targetDx / targetLength,
        targetDy / targetLength,
        (distance) => 1 + distance / totalLength,
        220
      );
    }

    const candidates = rawCandidates
      .map(({ placement, extraPenalty }, index) => ({
        placement,
        score:
          candidateScore(
            placement,
            [],
            obstacles,
            rectObstacles,
            options.bounds,
            index,
            placement.leader ? placement.t : preferredT,
            new Set(input.ignoredObstacleIds ?? [])
          ) + extraPenalty
      }))
      .filter(({ score }) => Number.isFinite(score))
      .sort(
        (left, right) =>
          left.score - right.score ||
          Number(Boolean(left.placement.leader)) -
            Number(Boolean(right.placement.leader)) ||
          left.placement.scale - right.placement.scale ||
          left.placement.t - right.placement.t ||
          left.placement.x - right.placement.x ||
          left.placement.y - right.placement.y
      )
      .slice(0, candidateLimit);

    return {
      input,
      length,
      candidates
    };
  });

  const solveOrder = [...candidateSets].sort(
    (left, right) =>
      left.candidates.length - right.candidates.length ||
      left.length - right.length ||
      left.input.id.localeCompare(right.input.id)
  );

  const findConflictFreePlacements = () => {
    const placements = new Map<string, EdgeLabelPlacement>();
    const rects: Rect[] = [];
    let visited = 0;
    const visitLimit = 2_000_000;

    const search = (setIndex: number): boolean => {
      if (setIndex >= solveOrder.length) return true;
      if (visited >= visitLimit) return false;

      const set = solveOrder[setIndex];
      for (const candidate of set.candidates) {
        visited += 1;
        const rect = rectFor(
          candidate.placement.x,
          candidate.placement.y,
          candidate.placement.scale,
          LABEL_GAP
        );
        if (rects.some((placed) => rectanglesOverlap(rect, placed))) {
          continue;
        }

        placements.set(set.input.id, candidate.placement);
        rects.push(rect);
        if (search(setIndex + 1)) return true;
        rects.pop();
        placements.delete(set.input.id);

        if (visited >= visitLimit) return false;
      }

      return false;
    };

    return search(0) ? new Map(placements) : null;
  };

  interface LayoutState {
    score: number;
    key: string;
    placements: Map<string, EdgeLabelPlacement>;
    rects: Rect[];
  }

  let states: LayoutState[] = [{
    score: 0,
    key: "",
    placements: new Map(),
    rects: []
  }];

  for (const set of solveOrder) {
    const nextStates: LayoutState[] = [];

    states.forEach((state) => {
      set.candidates.forEach((candidate, candidateIndex) => {
        const rect = rectFor(
          candidate.placement.x,
          candidate.placement.y,
          candidate.placement.scale,
          LABEL_GAP
        );
        if (state.rects.some((placed) => rectanglesOverlap(rect, placed))) {
          return;
        }

        const placements = new Map(state.placements);
        placements.set(set.input.id, candidate.placement);
        nextStates.push({
          score: state.score + candidate.score,
          key: `${state.key}:${candidateIndex.toString().padStart(3, "0")}`,
          placements,
          rects: [...state.rects, rect]
        });
      });
    });

    if (!nextStates.length) {
      const conflictFree = findConflictFreePlacements();
      if (conflictFree) return conflictFree;

      const fallback = set.candidates[0];
      if (!fallback) continue;

      states = states.map((state, stateIndex) => {
        const placements = new Map(state.placements);
        placements.set(set.input.id, fallback.placement);
        return {
          score: state.score + fallback.score + 50_000,
          key: `${state.key}:fallback-${stateIndex}`,
          placements,
          rects: [
            ...state.rects,
            rectFor(
              fallback.placement.x,
              fallback.placement.y,
              fallback.placement.scale,
              LABEL_GAP
            )
          ]
        };
      });
      continue;
    }

    nextStates.sort(
      (left, right) =>
        left.score - right.score ||
        left.key.localeCompare(right.key)
    );
    states = nextStates.slice(0, beamWidth);
  }

  return states[0]?.placements ?? new Map<string, EdgeLabelPlacement>();
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
