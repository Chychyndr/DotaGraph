import { DirectedGraph } from "graphology";
import type { Hero, MatchupRelationship } from "../../domain/types";

export interface SigmaSpikeNodeAttributes {
  x: number;
  y: number;
  size: number;
  label: string;
  color: string;
  heroId: string;
  image?: string;
  type?: string;
  hidden?: boolean;
  forceLabel?: boolean;
  zIndex?: number;
}

export interface SigmaSpikeEdgeAttributes {
  size: number;
  color: string;
  relationshipId: string;
  sourceWinRate: number;
  sampleSize: number;
  type: "arrow";
  hidden?: boolean;
  zIndex?: number;
}

export type SigmaSpikeGraph = DirectedGraph<
  SigmaSpikeNodeAttributes,
  SigmaSpikeEdgeAttributes
>;

export function buildSigmaSpikeGraph(
  heroes: Hero[],
  relationships: MatchupRelationship[]
): SigmaSpikeGraph {
  const graph = new DirectedGraph<
    SigmaSpikeNodeAttributes,
    SigmaSpikeEdgeAttributes
  >();

  for (const hero of heroes) {
    graph.addNode(hero.id, {
      x: hero.x,
      y: hero.y,
      size: 7,
      label: hero.name,
      color: "#8b949e",
      heroId: hero.id,
      zIndex: 1
    });
  }

  for (const relationship of relationships) {
    if (
      !graph.hasNode(relationship.sourceHeroId) ||
      !graph.hasNode(relationship.targetHeroId)
    ) {
      continue;
    }

    graph.addDirectedEdgeWithKey(
      relationship.id,
      relationship.sourceHeroId,
      relationship.targetHeroId,
      {
        size: 1,
        color: "#6e7681",
        relationshipId: relationship.id,
        sourceWinRate: relationship.sourceWinRate,
        sampleSize: relationship.sampleSize,
        type: "arrow",
        zIndex: 0
      }
    );
  }

  return graph;
}
