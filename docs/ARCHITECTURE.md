# Architecture

## Current frontend architecture

The current implementation uses React + TypeScript + Vite with a deterministic SVG graph renderer.

SVG is deliberately used for the current graph/frontend work because the fixture graph is small and custom portrait nodes, arrowheads, edge labels, keyboard focus, and DOM accessibility are straightforward.

The domain model and relationship selection logic are independent from the renderer so a later Sigma.js + Graphology renderer can replace SVG without rewriting product logic.

See `docs/adr/0001-graph-renderer.md`.

## Boundaries

- `src/domain/`: semantic types and pure relationship logic.
- `src/data/`: fixture data, scope metadata, dataset validation, and the asynchronous frontend loading boundary.
- `src/components/`: Search, contextual cards, and shared portrait-asset state.
- `src/graph/`: renderer/layout only.
- `src/styles/`: design tokens and app styling.

Future production pipeline should live under `pipeline/` and use Python + `uv`.

## Static hosting

The product targets GitHub Pages. Graph state uses query parameters so direct refresh does not require server routing.

Examples:
- `?hero=viper`
- `?hero=viper&matchup=shadow-demon`

## Data boundary

The frontend does not render raw imported data directly. `loadDataset` assembles the local published bundle and passes it through runtime validation before React receives it.

Loading and validation are intentionally explicit:
- while the bundle is pending, the graph is not presented as ready;
- malformed bundles block the graph instead of exposing partial relationships;
- a validated stale bundle remains usable with a visible warning;
- load failures expose a retry state.

Production observations must retain explicit direction, source win rate, sample size, patch, rank scope, provenance, and generation metadata.

Real source ingestion is outside the current frontend work and requires source and methodology approval.

## Portrait asset boundary

All hero portraits come from one local WebP atlas. `PortraitProvider` performs one deduplicated fetch and decode check, including under React StrictMode.

Once ready, components and the SVG graph use the decoded atlas through a local object URL. If the request or decode fails, the graph and cards keep their dimensions and switch to text fallbacks while the UI shows a non-blocking portrait warning.
