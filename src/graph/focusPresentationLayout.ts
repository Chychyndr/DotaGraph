import type { MatchupRelationship } from "../domain/types";

export interface FocusPresentationPoint {
  x: number;
  y: number;
  role: "selected" | "incoming" | "outgoing";
}

export interface FocusPresentationOptions {
  compact?: boolean;
}

const spreadSlots = (count: number, start: number, end: number) => {
  if (count <= 0) return [];
  if (count === 1) return [(start + end) / 2];

  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, index) => start + step * index);
};

const neighborFor = (
  selectedHeroId: string,
  relationship: MatchupRelationship
) =>
  relationship.sourceHeroId === selectedHeroId
    ? relationship.targetHeroId
    : relationship.sourceHeroId;

export function layoutFocusPresentation(
  selectedHeroId: string,
  incoming: MatchupRelationship[],
  outgoing: MatchupRelationship[],
  { compact = false }: FocusPresentationOptions = {}
) {
  const placements = new Map<string, FocusPresentationPoint>();

  const selected = compact
    ? { x: 600, y: 330 }
    : { x: 690, y: 380 };
  const incomingX = compact ? 465 : 430;
  const outgoingX = compact ? 735 : 975;
  const slotStart = compact ? 145 : 140;
  const slotEnd = compact ? 555 : 620;

  placements.set(selectedHeroId, {
    ...selected,
    role: "selected"
  });

  const incomingIds = incoming
    .map((relationship) => neighborFor(selectedHeroId, relationship))
    .filter((heroId, index, values) => values.indexOf(heroId) === index);
  const outgoingIds = outgoing
    .map((relationship) => neighborFor(selectedHeroId, relationship))
    .filter(
      (heroId, index, values) =>
        values.indexOf(heroId) === index && !incomingIds.includes(heroId)
    );

  spreadSlots(incomingIds.length, slotStart, slotEnd).forEach((y, index) => {
    placements.set(incomingIds[index], {
      x: incomingX,
      y,
      role: "incoming"
    });
  });

  spreadSlots(outgoingIds.length, slotStart, slotEnd).forEach((y, index) => {
    placements.set(outgoingIds[index], {
      x: outgoingX,
      y,
      role: "outgoing"
    });
  });

  return placements;
}
