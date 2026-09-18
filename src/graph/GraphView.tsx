import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import type { Hero, MatchupRelationship, SelectedRelations } from "../domain/types";
import { formatPercent } from "../domain/relationships";
import {
  HERO_ATLAS_CELL_SIZE,
  HERO_ATLAS_HEIGHT,
  HERO_ATLAS_URL,
  HERO_ATLAS_WIDTH,
  getHeroSpriteCell
} from "../data/heroSprite";

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
  onClearSelection: () => void;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
}

interface CameraState {
  anchorX: number;
  anchorY: number;
  panX: number;
  panY: number;
  zoom: number;
  focusScale: number;
}

const WIDTH = 1200;
const HEIGHT = 760;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 2.4;
const DRAG_THRESHOLD = 5;
const CAMERA_DURATION = 460;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const lerp = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

const easeOutQuart = (progress: number) =>
  1 - Math.pow(1 - progress, 4);

export function GraphView({
  heroes,
  relationships,
  selectedHeroId,
  hoveredHeroId,
  matchupHeroId,
  selectedRelations,
  onSelectHero,
  onSelectMatchup,
  onHoverHero,
  onClearSelection
}: GraphViewProps) {
  const byId = useMemo(() => new Map(heroes.map((hero) => [hero.id, hero])), [heroes]);
  const initialHero = selectedHeroId ? byId.get(selectedHeroId) : undefined;
  const initialCamera: CameraState = {
    anchorX: initialHero?.x ?? WIDTH / 2,
    anchorY: initialHero?.y ?? HEIGHT / 2,
    panX: 0,
    panY: 0,
    zoom: 1,
    focusScale: initialHero ? 1.04 : 1
  };

  const [camera, setCameraState] = useState<CameraState>(initialCamera);
  const [isPanning, setIsPanning] = useState(false);
  const cameraRef = useRef(camera);
  const animationFrameRef = useRef<number | null>(null);
  const previousSelectionRef = useRef(selectedHeroId);
  const dragRef = useRef<DragState | null>(null);

  const setCamera = (next: CameraState | ((current: CameraState) => CameraState)) => {
    setCameraState((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      cameraRef.current = resolved;
      return resolved;
    });
  };

  const cancelCameraAnimation = () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  useEffect(() => {
    if (previousSelectionRef.current === selectedHeroId) return;
    previousSelectionRef.current = selectedHeroId;

    cancelCameraAnimation();

    const selected = selectedHeroId ? byId.get(selectedHeroId) : undefined;
    const target: CameraState = {
      anchorX: selected?.x ?? WIDTH / 2,
      anchorY: selected?.y ?? HEIGHT / 2,
      panX: 0,
      panY: 0,
      zoom: 1,
      focusScale: selected ? 1.04 : 1
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCamera(target);
      return;
    }

    const from = cameraRef.current;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const rawProgress = clamp((now - startedAt) / CAMERA_DURATION, 0, 1);
      const progress = easeOutQuart(rawProgress);

      setCamera({
        anchorX: lerp(from.anchorX, target.anchorX, progress),
        anchorY: lerp(from.anchorY, target.anchorY, progress),
        panX: lerp(from.panX, target.panX, progress),
        panY: lerp(from.panY, target.panY, progress),
        zoom: lerp(from.zoom, target.zoom, progress),
        focusScale: lerp(from.focusScale, target.focusScale, progress)
      });

      if (rawProgress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return cancelCameraAnimation;
  }, [selectedHeroId, byId]);

  useEffect(() => cancelCameraAnimation, []);

  const activeRelationships = [...selectedRelations.incoming, ...selectedRelations.outgoing];
  const activeIds = new Set(activeRelationships.flatMap((relationship) => [
    relationship.sourceHeroId,
    relationship.targetHeroId
  ]));
  const activeRelationshipIds = new Set(activeRelationships.map((relationship) => relationship.id));
  const cameraScale = camera.zoom * camera.focusScale;
  const cameraTransform =
    `translate(${WIDTH / 2 + camera.panX} ${HEIGHT / 2 + camera.panY}) scale(${cameraScale}) translate(${-camera.anchorX} ${-camera.anchorY})`;

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

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest(".hero-node")) return;

    cancelCameraAnimation();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const totalDistance = Math.hypot(
      event.clientX - drag.startX,
      event.clientY - drag.startY
    );

    if (!drag.moved && totalDistance >= DRAG_THRESHOLD) {
      drag.moved = true;
      setIsPanning(true);
    }

    if (!drag.moved) return;

    const ctm = event.currentTarget.getScreenCTM();
    const scaleX = ctm ? Math.hypot(ctm.a, ctm.b) : 1;
    const scaleY = ctm ? Math.hypot(ctm.c, ctm.d) : 1;
    const dx = (event.clientX - drag.lastX) / Math.max(scaleX, 0.001);
    const dy = (event.clientY - drag.lastY) / Math.max(scaleY, 0.001);

    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    setCamera((current) => ({
      ...current,
      panX: current.panX + dx,
      panY: current.panY + dy
    }));
  };

  const finishPointer = (event: ReactPointerEvent<SVGSVGElement>, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (!cancelled && !drag.moved && selectedHeroId) {
      onClearSelection();
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsPanning(false);
  };

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    cancelCameraAnimation();

    const svg = event.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const cursor = point.matrixTransform(ctm.inverse());
    const current = cameraRef.current;
    const nextZoom = clamp(
      current.zoom * Math.exp(-event.deltaY * 0.0012),
      MIN_ZOOM,
      MAX_ZOOM
    );
    if (Math.abs(nextZoom - current.zoom) < 0.0001) return;

    const ratio = nextZoom / current.zoom;
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;

    setCamera({
      ...current,
      panX: cursor.x - centerX - ratio * (cursor.x - centerX - current.panX),
      panY: cursor.y - centerY - ratio * (cursor.y - centerY - current.panY),
      zoom: nextZoom
    });
  };

  return (
    <svg
      className={isPanning ? "graph graph-panning" : "graph"}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Interactive graph of Dota 2 hero counter relationships"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishPointer(event)}
      onPointerCancel={(event) => finishPointer(event, true)}
      onWheel={handleWheel}
    >
      <defs>
        <marker id="arrow-incoming" viewBox="0 0 6 6" refX="5.3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 6 3 0 6Z" className="marker-incoming" />
        </marker>
        <marker id="arrow-outgoing" viewBox="0 0 6 6" refX="5.3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 6 3 0 6Z" className="marker-outgoing" />
        </marker>

        <image
          id="hero-atlas-image"
          href={HERO_ATLAS_URL}
          width={HERO_ATLAS_WIDTH}
          height={HERO_ATLAS_HEIGHT}
        />
        {heroes.map((hero) => {
          const sprite = getHeroSpriteCell(hero.spriteIndex);

          return (
            <pattern
              id={`hero-portrait-${hero.spriteIndex}`}
              key={`hero-portrait-${hero.id}`}
              width="1"
              height="1"
              viewBox={`${sprite.x} ${sprite.y} ${HERO_ATLAS_CELL_SIZE} ${HERO_ATLAS_CELL_SIZE}`}
              preserveAspectRatio="xMidYMid slice"
            >
              <use href="#hero-atlas-image" />
            </pattern>
          );
        })}
      </defs>

      <g className="graph-camera" transform={cameraTransform}>
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
                onPointerDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    activate();
                  }
                }}
              >
                <circle className="node-hitarea" r={Math.max(24, radius + 8)} />
                <circle className="node-ring" r={radius + (isSelected ? 4 : 2)} />
                <circle
                  className="hero-portrait-node"
                  r={radius}
                  fill={`url(#hero-portrait-${hero.spriteIndex})`}
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
