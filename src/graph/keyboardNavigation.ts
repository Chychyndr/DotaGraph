import type { Hero } from "../domain/types";

export type GraphNavigationDirection = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

const vectors: Record<GraphNavigationDirection, { x: number; y: number }> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};

export function findHeroInDirection(
  currentHeroId: string,
  direction: GraphNavigationDirection,
  heroes: Hero[]
): Hero | undefined {
  const current = heroes.find((hero) => hero.id === currentHeroId);
  if (!current) return undefined;

  const vector = vectors[direction];

  return heroes
    .filter((hero) => hero.id !== currentHeroId)
    .map((hero) => {
      const dx = hero.x - current.x;
      const dy = hero.y - current.y;
      const projection = dx * vector.x + dy * vector.y;
      if (projection <= 0) return null;

      const perpendicular = Math.abs(dx * vector.y - dy * vector.x);
      const distance = Math.hypot(dx, dy);
      const score = distance * (1 + perpendicular / Math.max(projection, 1));

      return { hero, score, projection };
    })
    .filter((candidate): candidate is { hero: Hero; score: number; projection: number } => Boolean(candidate))
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.projection - b.projection ||
        a.hero.name.localeCompare(b.hero.name)
    )[0]?.hero;
}


export function findNearestHeroToPoint(
  heroes: Hero[],
  x: number,
  y: number
): Hero | undefined {
  return [...heroes].sort((a, b) => {
    const distanceA = Math.hypot(a.x - x, a.y - y);
    const distanceB = Math.hypot(b.x - x, b.y - y);
    return distanceA - distanceB || a.name.localeCompare(b.name);
  })[0];
}
