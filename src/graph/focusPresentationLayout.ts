import type { Hero } from "../domain/types";

export interface FocusPosition {
  x: number;
  y: number;
}

export interface FocusPresentationGroups {
  incoming: Hero[];
  outgoing: Hero[];
}

export interface FocusPresentationOptions {
  radius?: number;
  halfArcAngle?: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

const uniqueHeroes = (heroes: Hero[], excluded = new Set<string>()) => {
  const seen = new Set(excluded);
  return heroes
    .filter((hero) => {
      if (seen.has(hero.id)) return false;
      seen.add(hero.id);
      return true;
    })
    .sort(
      (a, b) =>
        a.y - b.y ||
        a.x - b.x ||
        a.id.localeCompare(b.id)
    );
};

const placeSide = (
  selected: Hero,
  heroes: Hero[],
  side: "left" | "right",
  radius: number,
  halfArcAngle: number,
  result: Map<string, FocusPosition>
) => {
  const count = heroes.length;

  heroes.forEach((hero, index) => {
    const progress = count <= 1 ? 0.5 : index / (count - 1);
    const verticalAngle = -halfArcAngle + progress * halfArcAngle * 2;
    const angle =
      side === "right"
        ? verticalAngle
        : Math.PI - verticalAngle;

    result.set(hero.id, {
      x: round(selected.x + Math.cos(angle) * radius),
      y: round(selected.y + Math.sin(angle) * radius)
    });
  });
};

export function layoutFocusPresentation(
  selected: Hero,
  groups: FocusPresentationGroups,
  {
    radius = 330,
    halfArcAngle = Math.PI * 5 / 18
  }: FocusPresentationOptions = {}
): Map<string, FocusPosition> {
  const result = new Map<string, FocusPosition>();
  result.set(selected.id, { x: selected.x, y: selected.y });

  const incoming = uniqueHeroes(
    groups.incoming.filter((hero) => hero.id !== selected.id)
  );
  const incomingIds = new Set(incoming.map((hero) => hero.id));
  const outgoing = uniqueHeroes(
    groups.outgoing.filter((hero) => hero.id !== selected.id),
    incomingIds
  );

  placeSide(selected, incoming, "left", radius, halfArcAngle, result);
  placeSide(selected, outgoing, "right", radius, halfArcAngle, result);

  return result;
}
