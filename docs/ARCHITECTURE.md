# Architecture

## Current frontend architecture

The current implementation uses React + TypeScript + Vite with a deterministic SVG graph renderer.

SVG is deliberately used for the current graph/frontend work because the fixture graph is small and custom portrait nodes, arrowheads, edge labels, keyboard focus, and DOM accessibility are straightforward.

The domain model and relationship selection logic are independent from the renderer so a later Sigma.js + Graphology renderer can replace SVG without rewriting product logic.

See `docs/adr/0001-graph-renderer.md`.

## Boundaries

- `src/domain/`: semantic types and pure relationship logic.
- `src/data/`: fixture data and current scope metadata.
- `src/components/`: Search and contextual cards.
- `src/graph/`: renderer/layout only.
- `src/styles/`: design tokens and app styling.

Future production pipeline should live under `pipeline/` and use Python + `uv`.

## Static hosting

The product targets GitHub Pages. Graph state uses query parameters so direct refresh does not require server routing.

Examples:
- `?hero=viper`
- `?hero=viper&matchup=shadow-demon`

## Data boundary

Frontend consumes validated generated data. Production observations must retain explicit direction, source win rate, sample size, patch, rank scope, provenance, and generation metadata.

Real source ingestion is outside the current frontend work and requires source and methodology approval.
