import { useEffect, useMemo, useRef } from "react";
import { NodeImageProgram } from "@sigma/node-image";
import Sigma from "sigma";
import type { Hero, MatchupRelationship, SelectedRelations } from "../../domain/types";
import { buildSigmaSpikeGraph } from "./buildSigmaGraph";
import { getSigmaHeroPortraits } from "./heroPortraitDataUrls";

interface SigmaSpikeViewProps {
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

const COLORS = {
  mutedNode: "#8b949e",
  dimNode: "#30363d",
  selected: "#d29922",
  active: "#f0f6fc",
  incoming: "#f85149",
  outgoing: "#58a6ff",
  edge: "#6e7681",
  dimEdge: "#21262d"
};

export function SigmaSpikeView({
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
}: SigmaSpikeViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<Sigma | null>(null);

  const graph = useMemo(
    () => buildSigmaSpikeGraph(heroes, relationships),
    [heroes, relationships]
  );

  const latestState = useRef({
    selectedHeroId,
    matchupHeroId,
    activeIds: new Set<string>(),
    onSelectHero,
    onSelectMatchup,
    onHoverHero,
    onClearSelection
  });

  const activeRelationships = useMemo(
    () => [...selectedRelations.incoming, ...selectedRelations.outgoing],
    [selectedRelations]
  );

  const activeIds = useMemo(
    () => new Set(
      activeRelationships.flatMap((relationship) => [
        relationship.sourceHeroId,
        relationship.targetHeroId
      ])
    ),
    [activeRelationships]
  );

  useEffect(() => {
    latestState.current = {
      selectedHeroId,
      matchupHeroId,
      activeIds,
      onSelectHero,
      onSelectMatchup,
      onHoverHero,
      onClearSelection
    };
  }, [
    selectedHeroId,
    matchupHeroId,
    activeIds,
    onSelectHero,
    onSelectMatchup,
    onHoverHero,
    onClearSelection
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Sigma(graph, container, {
      defaultEdgeType: "arrow",
      nodeProgramClasses: {
        image: NodeImageProgram
      },
      labelColor: { color: "#f0f6fc" },
      labelFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      labelSize: 11,
      labelDensity: 0.08,
      labelRenderedSizeThreshold: 8,
      minCameraRatio: 0.08,
      maxCameraRatio: 2.8,
      zIndex: true
    });

    rendererRef.current = renderer;

    renderer.on("clickNode", ({ node }) => {
      const state = latestState.current;
      if (state.selectedHeroId && state.activeIds.has(node) && node !== state.selectedHeroId) {
        state.onSelectMatchup(node);
      } else {
        state.onSelectHero(node);
      }
    });

    renderer.on("clickStage", () => {
      if (latestState.current.selectedHeroId) {
        latestState.current.onClearSelection();
      }
    });

    renderer.on("enterNode", ({ node }) => {
      latestState.current.onHoverHero(node);
    });

    renderer.on("leaveNode", () => {
      latestState.current.onHoverHero(null);
    });

    return () => {
      renderer.kill();
      rendererRef.current = null;
    };
  }, [graph]);

  useEffect(() => {
    let cancelled = false;

    getSigmaHeroPortraits(heroes)
      .then((portraits) => {
        if (cancelled) return;

        for (const hero of heroes) {
          const image = portraits.get(hero.spriteIndex);
          if (!image || !graph.hasNode(hero.id)) continue;

          graph.mergeNodeAttributes(hero.id, {
            image,
            type: "image"
          });
        }

        rendererRef.current?.refresh();
      })
      .catch((error: unknown) => {
        console.warn("Sigma portrait texture spike failed.", error);
      });

    return () => {
      cancelled = true;
    };
  }, [graph, heroes]);

  useEffect(() => {
    const activeRelationshipIds = new Set(
      activeRelationships.map((relationship) => relationship.id)
    );

    graph.forEachNode((node) => {
      const isSelected = node === selectedHeroId;
      const isActive = activeIds.has(node) && !isSelected;
      const isHovered = node === hoveredHeroId;
      const isMatchup = node === matchupHeroId;
      const shouldDim = Boolean(selectedHeroId && !isSelected && !isActive);

      graph.mergeNodeAttributes(node, {
        color: isSelected
          ? COLORS.selected
          : isMatchup || isActive
            ? COLORS.active
            : shouldDim
              ? COLORS.dimNode
              : COLORS.mutedNode,
        size: isSelected ? 18 : isActive ? 11 : isHovered ? 10 : 7,
        zIndex: isSelected ? 4 : isMatchup ? 3 : isActive ? 2 : 1,
        forceLabel: isSelected || isActive || isHovered
      });
    });

    graph.forEachEdge((edge, attributes, source, target) => {
      const isActive = activeRelationshipIds.has(edge);
      const isIncoming = isActive && selectedHeroId === target;
      const isOutgoing = isActive && selectedHeroId === source;
      const isMatchup = Boolean(
        matchupHeroId &&
        isActive &&
        (source === matchupHeroId || target === matchupHeroId)
      );

      graph.mergeEdgeAttributes(edge, {
        color: isIncoming
          ? COLORS.incoming
          : isOutgoing
            ? COLORS.outgoing
            : selectedHeroId
              ? COLORS.dimEdge
              : COLORS.edge,
        size: isMatchup ? 2.2 : isActive ? 1.4 : 0.7,
        hidden: Boolean(selectedHeroId && !isActive),
        zIndex: isMatchup ? 3 : isActive ? 2 : 0
      });
    });

    rendererRef.current?.refresh();
  }, [
    graph,
    activeRelationships,
    activeIds,
    selectedHeroId,
    hoveredHeroId,
    matchupHeroId
  ]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    if (!selectedHeroId) {
      renderer.getCamera().animatedReset({ duration: 420 });
      return;
    }

    const displayData = renderer.getNodeDisplayData(selectedHeroId);
    if (!displayData) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      renderer.getCamera().setState({
        x: displayData.x,
        y: displayData.y,
        ratio: 0.7
      });
      return;
    }

    renderer.getCamera().animate(
      {
        x: displayData.x,
        y: displayData.y,
        ratio: 0.7
      },
      {
        duration: 460,
        easing: "quadraticInOut"
      }
    );
  }, [selectedHeroId]);

  return (
    <div
      ref={containerRef}
      className="sigma-spike"
      role="img"
      aria-label="Sigma renderer comparison graph"
      data-renderer="sigma"
    />
  );
}
