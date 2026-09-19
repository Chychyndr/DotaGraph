import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import type { Hero, MatchupRelationship, SelectedRelations } from "../domain/types";
import { formatPercent } from "../domain/relationships";
import { findHeroInDirection, findNearestHeroToPoint, type GraphNavigationDirection } from "./keyboardNavigation";
import {
  HERO_ATLAS_CELL_SIZE,
  HERO_ATLAS_HEIGHT,
  HERO_ATLAS_WIDTH,
  getHeroFallbackLabel,
  getHeroSpriteCell
} from "../data/heroSprite";
import { usePortraitAsset } from "../components/PortraitProvider";
import {
  EDGE_LABEL_HEIGHT,
  EDGE_LABEL_WIDTH,
  layoutSourceAnchoredEdgeLabels
} from "./edgeLabelLayout";
import {
  calculateFocusScale,
  calculateOverviewCamera,
  visibleViewBoxForViewport
} from "./focusCamera";
import {
  mergeVisibleRelationships,
  selectHoverRelationships,
  selectOverviewBackbone
} from "./relationshipVisibility";
import { layoutHeroLabels } from "./heroLabelLayout";

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
const COMPACT_VIEWPORT_QUERY = "(max-width: 640px)";
const COMPACT_FOCUS_OFFSET_Y = -120;
const DESKTOP_FOCUS_OFFSET_X = 100;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const lerp = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

const easeOutQuart = (progress: number) =>
  1 - Math.pow(1 - progress, 4);

const normalizeAngle = (angle: number) => {
  const fullTurn = Math.PI * 2;
  const normalized = angle % fullTurn;
  return normalized < 0 ? normalized + fullTurn : normalized;
};

const largestAngularGap = (
  center: { x: number; y: number },
  neighbors: Array<{ x: number; y: number }>
) => {
  if (!neighbors.length) {
    return { angle: -Math.PI / 2, halfGap: Math.PI };
  }

  const angles = neighbors
    .map((neighbor) =>
      normalizeAngle(Math.atan2(neighbor.y - center.y, neighbor.x - center.x))
    )
    .sort((a, b) => a - b);

  if (angles.length === 1) {
    return {
      angle: normalizeAngle(angles[0] + Math.PI),
      halfGap: Math.PI
    };
  }

  let bestStart = angles[0];
  let bestGap = -1;

  for (let index = 0; index < angles.length; index += 1) {
    const start = angles[index];
    const end =
      index === angles.length - 1
        ? angles[0] + Math.PI * 2
        : angles[index + 1];
    const gap = end - start;

    if (gap > bestGap) {
      bestGap = gap;
      bestStart = start;
    }
  }

  return {
    angle: normalizeAngle(bestStart + bestGap / 2),
    halfGap: bestGap / 2
  };
};

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
  const portraitAsset = usePortraitAsset();
  const byId = useMemo(() => new Map(heroes.map((hero) => [hero.id, hero])), [heroes]);
  const initialCompactViewport = window.matchMedia(COMPACT_VIEWPORT_QUERY).matches;
  const [isCompactViewport, setIsCompactViewport] = useState(initialCompactViewport);
  const [svgViewport, setSvgViewport] = useState({ width: WIDTH, height: HEIGHT });
  const selectedHero = selectedHeroId ? byId.get(selectedHeroId) : undefined;
  const relatedHeroes = useMemo(() => {
    if (!selectedHeroId) return [];

    const ids = new Set(
      [...selectedRelations.incoming, ...selectedRelations.outgoing]
        .flatMap((relationship) => [relationship.sourceHeroId, relationship.targetHeroId])
        .filter((heroId) => heroId !== selectedHeroId)
    );

    return [...ids].flatMap((heroId) => {
      const hero = byId.get(heroId);
      return hero ? [hero] : [];
    });
  }, [byId, selectedHeroId, selectedRelations]);

  const visibleGraphSpan = useMemo(
    () => visibleViewBoxForViewport(
      svgViewport.width,
      svgViewport.height,
      WIDTH,
      HEIGHT,
      isCompactViewport ? "slice" : "meet"
    ),
    [isCompactViewport, svgViewport]
  );

  const overviewCamera = useMemo(
    () =>
      calculateOverviewCamera(heroes, {
        width: WIDTH,
        height: HEIGHT
      }),
    [heroes]
  );
  const targetFocusScale =
    selectedHero && isCompactViewport
      ? calculateFocusScale(selectedHero, relatedHeroes, {
          ...visibleGraphSpan,
          offsetY: COMPACT_FOCUS_OFFSET_Y,
          paddingX: 60,
          paddingY: 54
        })
      : overviewCamera.scale;

  const initialCamera: CameraState = {
    anchorX:
      selectedHero && initialCompactViewport
        ? selectedHero.x
        : overviewCamera.anchorX,
    anchorY:
      selectedHero && initialCompactViewport
        ? selectedHero.y
        : overviewCamera.anchorY,
    panX:
      selectedHero && !initialCompactViewport
        ? DESKTOP_FOCUS_OFFSET_X
        : 0,
    panY: selectedHero && initialCompactViewport ? COMPACT_FOCUS_OFFSET_Y : 0,
    zoom: 1,
    focusScale:
      selectedHero && initialCompactViewport
        ? targetFocusScale
        : overviewCamera.scale
  };

  const [camera, setCameraState] = useState<CameraState>(initialCamera);
  const [isPanning, setIsPanning] = useState(false);
  const initialKeyboardHero = selectedHeroId
    ? byId.get(selectedHeroId)
    : findNearestHeroToPoint(heroes, WIDTH / 2, HEIGHT / 2);
  const [keyboardHeroId, setKeyboardHeroId] = useState<string | null>(initialKeyboardHero?.id ?? null);
  const cameraRef = useRef(camera);
  const svgRef = useRef<SVGSVGElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousCameraTargetRef = useRef(
    `${selectedHeroId ?? ""}:${initialCompactViewport}:${
      selectedHero ? targetFocusScale.toFixed(4) : overviewCamera.scale.toFixed(4)
    }:${overviewCamera.anchorX.toFixed(2)}:${overviewCamera.anchorY.toFixed(2)}`
  );
  const previousKeyboardSelectionRef = useRef(selectedHeroId);
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
    const cameraTargetKey = `${selectedHeroId ?? ""}:${isCompactViewport}:${
      selectedHero ? targetFocusScale.toFixed(4) : overviewCamera.scale.toFixed(4)
    }:${overviewCamera.anchorX.toFixed(2)}:${overviewCamera.anchorY.toFixed(2)}`;
    if (previousCameraTargetRef.current === cameraTargetKey) return;
    previousCameraTargetRef.current = cameraTargetKey;

    cancelCameraAnimation();

    const compactSelected =
      selectedHeroId && isCompactViewport
        ? byId.get(selectedHeroId)
        : undefined;
    const target: CameraState = {
      anchorX: compactSelected?.x ?? overviewCamera.anchorX,
      anchorY: compactSelected?.y ?? overviewCamera.anchorY,
      panX:
        selectedHeroId && !isCompactViewport
          ? DESKTOP_FOCUS_OFFSET_X
          : 0,
      panY: compactSelected ? COMPACT_FOCUS_OFFSET_Y : 0,
      zoom: 1,
      focusScale: compactSelected ? targetFocusScale : overviewCamera.scale
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
  }, [
    selectedHeroId,
    selectedHero,
    byId,
    isCompactViewport,
    targetFocusScale,
    overviewCamera
  ]);

  useEffect(() => cancelCameraAnimation, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const updateViewport = () => {
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      setSvgViewport((current) => {
        if (
          Math.abs(current.width - rect.width) < 0.5 &&
          Math.abs(current.height - rect.height) < 0.5
        ) {
          return current;
        }

        return { width: rect.width, height: rect.height };
      });
    };

    updateViewport();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateViewport);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia(COMPACT_VIEWPORT_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsCompactViewport(event.matches);

    setIsCompactViewport(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);


  useEffect(() => {
    if (previousKeyboardSelectionRef.current === selectedHeroId) return;
    previousKeyboardSelectionRef.current = selectedHeroId;

    if (!selectedHeroId) return;

    setKeyboardHeroId(selectedHeroId);
    window.requestAnimationFrame(() => {
      document.getElementById(`graph-hero-${selectedHeroId}`)?.focus({ preventScroll: true });
    });
  }, [selectedHeroId]);


  const activeRelationships = useMemo(
    () => [...selectedRelations.incoming, ...selectedRelations.outgoing],
    [selectedRelations]
  );
  const overviewRelationships = useMemo(
    () => selectOverviewBackbone(relationships),
    [relationships]
  );
  const hoverRelationships = useMemo(
    () =>
      hoveredHeroId && !selectedHeroId
        ? selectHoverRelationships(hoveredHeroId, relationships)
        : [],
    [hoveredHeroId, relationships, selectedHeroId]
  );
  const visibleRelationships = useMemo(
    () =>
      mergeVisibleRelationships(
        overviewRelationships,
        activeRelationships,
        hoverRelationships
      ),
    [
      activeRelationships,
      hoverRelationships,
      overviewRelationships
    ]
  );
  const activeIds = new Set(activeRelationships.flatMap((relationship) => [
    relationship.sourceHeroId,
    relationship.targetHeroId
  ]));
  const activeRelationshipIds = new Set(activeRelationships.map((relationship) => relationship.id));
  const cameraScale = camera.zoom * camera.focusScale;
  const cameraTransform =
    `translate(${WIDTH / 2 + camera.panX} ${HEIGHT / 2 + camera.panY}) scale(${cameraScale}) translate(${-camera.anchorX} ${-camera.anchorY})`;
  const projectGraphPoint = (x: number, y: number) => ({
    x: WIDTH / 2 + camera.panX + cameraScale * (x - camera.anchorX),
    y: HEIGHT / 2 + camera.panY + cameraScale * (y - camera.anchorY)
  });

  const hoverRelationshipIds = new Set(
    hoverRelationships.map((relationship) => relationship.id)
  );

  const radiusFor = (heroId: string) => {
    if (heroId === selectedHeroId || activeIds.has(heroId)) return 14;
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

  const labelWidthFor = (hero: Hero) =>
    Math.max(42, hero.name.length * 6.7 + 14);

  const labelHeroes = heroes
    .filter(
      (hero) =>
        hero.id === selectedHeroId ||
        activeIds.has(hero.id) ||
        hero.id === hoveredHeroId
    )
    .sort((left, right) => {
      const priority = (hero: Hero) =>
        hero.id === selectedHeroId ? 0 : activeIds.has(hero.id) ? 1 : 2;
      return priority(left) - priority(right) || left.id.localeCompare(right.id);
    });

  const activeEdgeSegments = activeRelationships.flatMap((relationship) => {
    const source = byId.get(relationship.sourceHeroId);
    const target = byId.get(relationship.targetHeroId);
    if (!source || !target) return [];

    return [edgeGeometry(source, target)];
  });

  const heroLabelPlacements = layoutHeroLabels(
    labelHeroes.map((hero) => {
      let preferredAngle =
        hero.x > WIDTH - 170 ? Math.PI : 0;

      if (hero.id === selectedHeroId) {
        preferredAngle = largestAngularGap(hero, relatedHeroes).angle;
      } else if (selectedHero && activeIds.has(hero.id)) {
        preferredAngle = Math.atan2(
          hero.y - selectedHero.y,
          hero.x - selectedHero.x
        );
      }

      return {
        id: hero.id,
        x: hero.x,
        y: hero.y,
        radius: radiusFor(hero.id),
        width: labelWidthFor(hero),
        height: 20,
        preferredAngle
      };
    }),
    activeEdgeSegments,
    [...activeIds].flatMap((heroId) => {
      const hero = byId.get(heroId);
      return hero
        ? [{
            id: hero.id,
            x: hero.x,
            y: hero.y,
            radius: radiusFor(hero.id) + 3
          }]
        : [];
    })
  );

  const edgeLabelPlacements = layoutSourceAnchoredEdgeLabels(
    activeRelationships.flatMap((relationship) => {
      const source = byId.get(relationship.sourceHeroId);
      const target = byId.get(relationship.targetHeroId);
      if (!source || !target) return [];

      const geometry = edgeGeometry(source, target);
      const start = projectGraphPoint(geometry.x1, geometry.y1);
      const end = projectGraphPoint(geometry.x2, geometry.y2);
      const sourcePoint = projectGraphPoint(source.x, source.y);

      return [{
        id: relationship.id,
        segment: {
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y
        },
        preferredT: relationship.sourceHeroId === selectedHeroId ? 0.46 : 0.34,
        source: {
          x: sourcePoint.x,
          y: sourcePoint.y,
          radius: (radiusFor(source.id) + 7) * cameraScale
        }
      }];
    }),
    [...activeIds].flatMap((heroId) => {
      const hero = byId.get(heroId);
      if (!hero) return [];

      const point = projectGraphPoint(hero.x, hero.y);
      return [{
        x: point.x,
        y: point.y,
        radius: (radiusFor(hero.id) + 7) * cameraScale
      }];
    })
  );

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
    <>
      <p id="graph-keyboard-instructions" className="sr-only">
        Use Tab to enter the graph. Use the arrow keys to move between nearby heroes, Enter or Space to select a hero, and Escape to leave the current focus or matchup.
      </p>
      <svg
      ref={svgRef}
      className={isPanning ? "graph graph-panning" : "graph"}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio={isCompactViewport ? "xMidYMid slice" : "xMidYMid meet"}
      role="group"
      aria-roledescription="interactive graph"
      aria-label="Dota 2 hero counter relationships"
      aria-describedby="graph-keyboard-instructions"
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

        {portraitAsset.status === "ready" && (
          <>
            <image
              id="hero-atlas-image"
              href={portraitAsset.url}
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
          </>
        )}
      </defs>

      <g className="graph-camera" transform={cameraTransform}>
        <g className="edges">
          {visibleRelationships.map((relationship) => {
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

            return (
              <line
                key={relationship.id}
                className={edgeClass}
                x1={geometry.x1}
                y1={geometry.y1}
                x2={geometry.x2}
                y2={geometry.y2}
                markerEnd={isIncoming ? "url(#arrow-incoming)" : isOutgoing ? "url(#arrow-outgoing)" : undefined}
                data-source-hero={relationship.sourceHeroId}
                data-target-hero={relationship.targetHeroId}
              />
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
            const size = isSelected || isActive ? 28 : isHovered ? 36 : 28;
            const radius = size / 2;
            const nodeClass = [
              "hero-node",
              isSelected ? "hero-selected" : "",
              isActive ? "hero-active" : "",
              isHovered ? "hero-hovered" : "",
              isMatchup ? "hero-matchup" : "",
              shouldDim ? "hero-dimmed" : ""
            ].filter(Boolean).join(" ");

            const activeRelationship = activeRelationships.find(
              (relationship) =>
                relationship.sourceHeroId === hero.id || relationship.targetHeroId === hero.id
            );
            const source = activeRelationship ? byId.get(activeRelationship.sourceHeroId) : undefined;
            const target = activeRelationship ? byId.get(activeRelationship.targetHeroId) : undefined;
            const accessibleLabel = isSelected
              ? `${hero.name}, selected hero`
              : activeRelationship && source && target
                ? `${hero.name}. ${source.name} counters ${target.name}; ${source.name} win rate ${formatPercent(activeRelationship.sourceWinRate)}`
                : `Select ${hero.name}`;

            const activate = () => {
              if (selectedHeroId && isActive && !isSelected) onSelectMatchup(hero.id);
              else onSelectHero(hero.id);
            };

            const moveKeyboardFocus = (direction: GraphNavigationDirection) => {
              const next = findHeroInDirection(hero.id, direction, heroes);
              if (!next) return;

              setKeyboardHeroId(next.id);
              onHoverHero(next.id);

              if (isCompactViewport && !selectedHeroId) {
                cancelCameraAnimation();
                setCamera((current) => ({
                  ...current,
                  anchorX: next.x,
                  anchorY: next.y,
                  panX: 0,
                  panY: 0
                }));
              }

              window.requestAnimationFrame(() => {
                document.getElementById(`graph-hero-${next.id}`)?.focus({ preventScroll: true });
              });
            };

            return (
              <g
                key={hero.id}
                id={`graph-hero-${hero.id}`}
                className={nodeClass}
                transform={`translate(${hero.x} ${hero.y})`}
                role="button"
                tabIndex={hero.id === keyboardHeroId ? 0 : -1}
                aria-label={accessibleLabel}
                aria-pressed={isSelected}
                onMouseEnter={() => onHoverHero(hero.id)}
                onMouseLeave={() => onHoverHero(null)}
                onFocus={() => {
                  setKeyboardHeroId(hero.id);
                  onHoverHero(hero.id);
                }}
                onBlur={() => onHoverHero(null)}
                onClick={activate}
                onPointerDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    activate();
                    return;
                  }

                  if (
                    event.key === "ArrowUp" ||
                    event.key === "ArrowDown" ||
                    event.key === "ArrowLeft" ||
                    event.key === "ArrowRight"
                  ) {
                    event.preventDefault();
                    moveKeyboardFocus(event.key);
                  }
                }}
              >
                <circle className="node-hitarea" r={Math.max(24, radius + 8)} />
                <circle className="node-ring" r={radius + (isSelected ? 4 : 2)} />
                {portraitAsset.status === "ready" ? (
                  <circle
                    className="hero-portrait-node"
                    r={radius}
                    fill={`url(#hero-portrait-${hero.spriteIndex})`}
                  />
                ) : (
                  <>
                    <circle
                      className={`hero-portrait-node hero-portrait-node-${portraitAsset.status}`}
                      r={radius}
                    />
                    {portraitAsset.status === "failed" && (
                      <text
                        className="hero-node-fallback-text"
                        textAnchor="middle"
                        dominantBaseline="central"
                        aria-hidden="true"
                      >
                        {getHeroFallbackLabel(hero.name)}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </g>

        <g className="hero-label-layer" aria-hidden="true">
          {heroes.map((hero) => {
            const showLabel =
              hero.id === selectedHeroId ||
              activeIds.has(hero.id) ||
              hero.id === hoveredHeroId;

            if (!showLabel) return null;

            const labelWidth = labelWidthFor(hero);
            const placement = heroLabelPlacements.get(hero.id);
            if (!placement) return null;

            return (
              <g
                key={`hero-label-${hero.id}`}
                className="hero-label-group"
                data-hero-label={hero.id}
                transform={`translate(${placement.x} ${placement.y})`}
              >
                <rect
                  className="hero-label-bg"
                  x={-labelWidth / 2}
                  y="-10"
                  width={labelWidth}
                  height="20"
                  rx="3"
                />
                <text
                  className="hero-label"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {hero.name}
                </text>
              </g>
            );
          })}
        </g>
      </g>

      <g className="edge-label-layer" aria-hidden="true">
          {activeRelationships.map((relationship) => {
            const labelPlacement = edgeLabelPlacements.get(relationship.id);
            if (!labelPlacement) return null;

            const isIncoming = selectedHeroId === relationship.targetHeroId;
            const isOutgoing = selectedHeroId === relationship.sourceHeroId;
            const isMatchup = Boolean(
              matchupHeroId &&
              (relationship.sourceHeroId === matchupHeroId || relationship.targetHeroId === matchupHeroId)
            );

            return (
              <g key={relationship.id} className="edge-label-entry">
                {labelPlacement.leader && (
                  <line
                    className={[
                      "edge-label-leader",
                      isIncoming ? "edge-incoming" : isOutgoing ? "edge-outgoing" : "",
                      matchupHeroId && !isMatchup ? "edge-deemphasized" : ""
                    ].filter(Boolean).join(" ")}
                    x1={labelPlacement.leader.x1}
                    y1={labelPlacement.leader.y1}
                    x2={labelPlacement.leader.x2}
                    y2={labelPlacement.leader.y2}
                  />
                )}
                <g
                  className={[
                    "edge-label",
                    isIncoming ? "label-incoming" : isOutgoing ? "label-outgoing" : "",
                    matchupHeroId && !isMatchup ? "edge-label-deemphasized" : ""
                  ].filter(Boolean).join(" ")}
                  transform={`translate(${labelPlacement.x} ${labelPlacement.y}) scale(${labelPlacement.scale})`}
                  data-source-hero={relationship.sourceHeroId}
                  data-target-hero={relationship.targetHeroId}
                  data-label-t={labelPlacement.t.toFixed(3)}
                  data-label-offset={labelPlacement.offset.toFixed(1)}
                  data-label-scale={labelPlacement.scale.toFixed(2)}
                  data-label-external={labelPlacement.leader ? "true" : "false"}
                >
                  <rect
                    x={-EDGE_LABEL_WIDTH / 2}
                    y={-EDGE_LABEL_HEIGHT / 2}
                    width={EDGE_LABEL_WIDTH}
                    height={EDGE_LABEL_HEIGHT}
                    rx={EDGE_LABEL_HEIGHT / 2}
                  />
                  <text textAnchor="middle" dominantBaseline="central">{formatPercent(relationship.sourceWinRate)}</text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </>
  );
}
