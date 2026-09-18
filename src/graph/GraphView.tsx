import { useMemo } from "react";
import type { Hero, MatchupRelationship, SelectedRelations } from "../domain/types";
import { formatPercent } from "../domain/relationships";

interface GraphViewProps {
  heroes: Hero[];
  relationships: MatchupRelationship[];
  selectedHeroId: string | null;
  hoveredHeroId: string | null;
  matchupHeroId: string | null;
  selectedRelations: SelectedRelations;
  onSelectHero: (heroId: string) => void;
  onSelectMatchup: (heroId: string) => void;
  onHoverHero: (heroId: string | null) => void;
}

const WIDTH = 1200;
const HEIGHT = 760;

export function GraphView({
  heroes,
  relationships,
  selectedHeroId,
  hoveredHeroId,
  matchupHeroId,
  selectedRelations,
  onSelectHero,
  onSelectMatchup,
  onHoverHero
}: GraphViewProps) {
  const byId = useMemo(() => new Map(heroes.map((hero) => [hero.id, hero])), [heroes]);
  const activeRelationships = [...selectedRelations.incoming, ...selectedRelations.outgoing];
  const activeIds = new Set(activeRelationships.flatMap((relationship) => [
    relationship.sourceHeroId,
    relationship.targetHeroId
  ]));
  const activeRelationshipIds = new Set(activeRelationships.map((relationship) => relationship.id));
  const selectedHero = selectedHeroId ? byId.get(selectedHeroId) : undefined;
  const focusTransform = selectedHero
    ? `translate(${WIDTH / 2} ${HEIGHT / 2}) scale(1.04) translate(${-selectedHero.x} ${-selectedHero.y})`
    : undefined;

  const hoverRelationshipIds = new Set(
    hoveredHeroId
      ? relationships
          .filter((relationship) =>
            relationship.sourceHeroId === hoveredHeroId || relationship.targetHeroId === hoveredHeroId
          )
          .map((relationship) => relationship.id)
      : []
  );

  const radiusFor = (heroId: string) => {
    if (heroId === selectedHeroId) return 36;
    if (activeIds.has(heroId)) return 21;
    if (heroId === hoveredHeroId) return 18;
    return 14;
  };

  const edgeGeometry = (source: Hero, target: Hero) => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const sourcePadding = radiusFor(source.id) + 4;
    const targetPadding = radiusFor(target.id) + 7;

    return {
      x1: source.x + ux * sourcePadding,
      y1: source.y + uy * sourcePadding,
      x2: target.x - ux * targetPadding,
      y2: target.y - uy * targetPadding
    };
  };

  return (
    <svg
      className="graph"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Interactive graph of Dota 2 hero counter relationships"
    >
      <defs>
        <marker id="arrow-incoming" viewBox="0 0 6 6" refX="5.3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 6 3 0 6Z" className="marker-incoming" />
        </marker>
        <marker id="arrow-outgoing" viewBox="0 0 6 6" refX="5.3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 6 3 0 6Z" className="marker-outgoing" />
        </marker>
        {heroes.map((hero) => (
          <clipPath id={`clip-${hero.id}`} key={hero.id}>
            <circle cx="0" cy="0" r="1" />
          </clipPath>
        ))}
      </defs>

      <g className="graph-camera" transform={focusTransform}>
        <g className="edges">
          {relationships.map((relationship) => {
            const source = byId.get(relationship.sourceHeroId);
            const target = byId.get(relationship.targetHeroId);
            if (!source || !target) return null;

            const isActive = activeRelationshipIds.has(relationship.id);
            const isHover = hoverRelationshipIds.has(relationship.id);
            const isIncoming = selectedHeroId === relationship.targetHeroId && isActive;
            const isOutgoing = selectedHeroId === relationship.sourceHeroId && isActive;
            const isMatchup = Boolean(
              matchupHeroId &&
              isActive &&
              (relationship.sourceHeroId === matchupHeroId || relationship.targetHeroId === matchupHeroId)
            );
            const edgeClass = [
              "edge",
              isActive ? "edge-active" : "",
              isIncoming ? "edge-incoming" : "",
              isOutgoing ? "edge-outgoing" : "",
              isHover && !selectedHeroId ? "edge-hover" : "",
              matchupHeroId && isActive && !isMatchup ? "edge-deemphasized" : "",
              isMatchup ? "edge-matchup" : ""
            ].filter(Boolean).join(" ");

            const geometry = edgeGeometry(source, target);
            const labelT = isOutgoing ? 0.42 : 0.30;
            const labelX = geometry.x1 + (geometry.x2 - geometry.x1) * labelT;
            const labelY = geometry.y1 + (geometry.y2 - geometry.y1) * labelT;

            return (
              <g key={relationship.id}>
                <line
                  className={edgeClass}
                  x1={geometry.x1}
                  y1={geometry.y1}
                  x2={geometry.x2}
                  y2={geometry.y2}
                  markerEnd={isIncoming ? "url(#arrow-incoming)" : isOutgoing ? "url(#arrow-outgoing)" : undefined}
                />
                {isActive && (
                  <g
                    className={[
                      "edge-label",
                      isIncoming ? "label-incoming" : "label-outgoing",
                      matchupHeroId && !isMatchup ? "edge-label-deemphasized" : ""
                    ].filter(Boolean).join(" ")}
                    transform={`translate(${labelX} ${labelY})`}
                    aria-hidden="true"
                  >
                    <rect x="-25" y="-10" width="50" height="20" rx="10" />
                    <text textAnchor="middle" dominantBaseline="central">{formatPercent(relationship.sourceWinRate)}</text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        <g className="nodes">
          {heroes.map((hero) => {
            const isSelected = hero.id === selectedHeroId;
            const isActive = activeIds.has(hero.id) && !isSelected;
            const isHovered = hero.id === hoveredHeroId;
            const isMatchup = hero.id === matchupHeroId;
            const shouldDim = Boolean(selectedHeroId && !isSelected && !isActive);
            const size = isSelected ? 72 : isActive ? 42 : isHovered ? 36 : 28;
            const radius = size / 2;
            const showLabel = isSelected || isActive || isHovered;
            const nodeClass = [
              "hero-node",
              isSelected ? "hero-selected" : "",
              isActive ? "hero-active" : "",
              isHovered ? "hero-hovered" : "",
              isMatchup ? "hero-matchup" : "",
              shouldDim ? "hero-dimmed" : ""
            ].filter(Boolean).join(" ");

            const activate = () => {
              if (selectedHeroId && isActive && !isSelected) onSelectMatchup(hero.id);
              else onSelectHero(hero.id);
            };

            return (
              <g
                key={hero.id}
                className={nodeClass}
                transform={`translate(${hero.x} ${hero.y})`}
                role="button"
                tabIndex={0}
                aria-label={isSelected ? `${hero.name}, selected hero` : `Select ${hero.name}`}
                onMouseEnter={() => onHoverHero(hero.id)}
                onMouseLeave={() => onHoverHero(null)}
                onClick={activate}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    activate();
                  }
                }}
              >
                <circle className="node-hitarea" r={Math.max(24, radius + 8)} />
                <circle className="node-ring" r={radius + (isSelected ? 4 : 2)} />
                <image
                  href={hero.portrait}
                  x={-radius}
                  y={-radius}
                  width={size}
                  height={size}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`circle(${radius}px at ${radius}px ${radius}px)`}
                />
                {showLabel && (
                  <text className="hero-label" x={radius + 9} y="4">{hero.name}</text>
                )}
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
