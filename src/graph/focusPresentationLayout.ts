import type { Hero } from "../domain/types";

export interface FocusPosition {
  x: number;
  y: number;
}

export interface FocusPresentationOptions {
  minSelectedDistance?: number;
  maxSelectedDistance?: number;
  minActiveDistance?: number;
  minAngularSeparation?: number;
  iterations?: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const deterministicAngle = (id: string) => {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 3600) / 3600 * Math.PI * 2;
};

export function layoutFocusPresentation(
  selected: Hero,
  related: Hero[],
  {
    minSelectedDistance = 180,
    maxSelectedDistance = 310,
    minActiveDistance = 120,
    minAngularSeparation = Math.PI / 9,
    iterations = 180
  }: FocusPresentationOptions = {}
): Map<string, FocusPosition> {
  const ordered = [...related]
    .filter(hero => hero.id !== selected.id)
    .sort((a, b) => a.id.localeCompare(b.id));

  const anchors = ordered.map(hero => {
    const dx = hero.x - selected.x;
    const dy = hero.y - selected.y;
    const originalDistance = Math.hypot(dx, dy);
    const angle =
      originalDistance > 1e-6
        ? Math.atan2(dy, dx)
        : deterministicAngle(hero.id);
    const radius = clamp(
      originalDistance || minSelectedDistance,
      minSelectedDistance,
      maxSelectedDistance
    );

    return {
      id: hero.id,
      x: selected.x + Math.cos(angle) * radius,
      y: selected.y + Math.sin(angle) * radius
    };
  });

  const points = anchors.map(anchor => ({ ...anchor }));

  const clampRadialDistance = (point: { id: string; x: number; y: number }) => {
    let dx = point.x - selected.x;
    let dy = point.y - selected.y;
    let distance = Math.hypot(dx, dy);

    if (distance < 1e-6) {
      const angle = deterministicAngle(point.id);
      dx = Math.cos(angle);
      dy = Math.sin(angle);
      distance = 1;
    }

    const targetDistance = clamp(
      distance,
      minSelectedDistance,
      maxSelectedDistance
    );
    if (Math.abs(targetDistance - distance) < 1e-6) return;

    point.x = selected.x + dx / distance * targetDistance;
    point.y = selected.y + dy / distance * targetDistance;
  };

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      const anchor = anchors[index];

      point.x += (anchor.x - point.x) * 0.025;
      point.y += (anchor.y - point.y) * 0.025;
      clampRadialDistance(point);
    }

    let moved = false;

    for (let left = 0; left < points.length; left += 1) {
      for (let right = left + 1; right < points.length; right += 1) {
        const a = points[left];
        const b = points[right];
        const radiusA = Math.hypot(a.x - selected.x, a.y - selected.y);
        const radiusB = Math.hypot(b.x - selected.x, b.y - selected.y);
        const angleA = Math.atan2(a.y - selected.y, a.x - selected.x);
        const angleB = Math.atan2(b.y - selected.y, b.x - selected.x);
        let difference = angleB - angleA;

        while (difference > Math.PI) difference -= Math.PI * 2;
        while (difference < -Math.PI) difference += Math.PI * 2;

        if (Math.abs(difference) >= minAngularSeparation) continue;

        const sign =
          Math.abs(difference) < 1e-6
            ? a.id.localeCompare(b.id) <= 0
              ? 1
              : -1
            : Math.sign(difference);
        const adjustment =
          (minAngularSeparation - Math.abs(difference)) / 2 + 0.001;

        const nextAngleA = angleA - sign * adjustment;
        const nextAngleB = angleB + sign * adjustment;

        a.x = selected.x + Math.cos(nextAngleA) * radiusA;
        a.y = selected.y + Math.sin(nextAngleA) * radiusA;
        b.x = selected.x + Math.cos(nextAngleB) * radiusB;
        b.y = selected.y + Math.sin(nextAngleB) * radiusB;
        moved = true;
      }
    }

    for (let left = 0; left < points.length; left += 1) {
      for (let right = left + 1; right < points.length; right += 1) {
        const a = points[left];
        const b = points[right];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);

        if (distance >= minActiveDistance) continue;

        if (distance < 1e-6) {
          const angle = deterministicAngle(`${a.id}:${b.id}`);
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }

        const push = (minActiveDistance - distance) / 2 + 0.1;
        const ux = dx / distance;
        const uy = dy / distance;

        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
        clampRadialDistance(a);
        clampRadialDistance(b);
        moved = true;
      }
    }

    if (!moved && iteration > 12) break;
  }

  const result = new Map<string, FocusPosition>();
  result.set(selected.id, { x: selected.x, y: selected.y });

  for (const point of points) {
    result.set(point.id, {
      x: Math.round(point.x * 100) / 100,
      y: Math.round(point.y * 100) / 100
    });
  }

  return result;
}
