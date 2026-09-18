# Architecture

## Current frontend architecture

The current implementation uses React + TypeScript + Vite with a deterministic SVG graph renderer.

SVG is deliberately used for the current graph/frontend work because the fixture graph is small and custom portrait nodes, arrowheads, edge labels, keyboard focus, and DOM accessibility are straightforward.

The domain model and relationship selection logic are independent from the renderer. A Sigma.js + Graphology spike was completed and the project chose to keep the deterministic SVG renderer for the current graph because it is smaller and better aligned with source-owned label layout, DOM accessibility, and deterministic testing. A future renderer change remains possible if graph scale materially changes.

See `docs/adr/0001-graph-renderer.md`.

## Boundaries

- `src/domain/`: semantic types and pure relationship logic.
- `src/data/`: fixture data, scope metadata, dataset validation, and the asynchronous frontend loading boundary.
- `src/components/`: Search, contextual cards, and shared portrait-asset state.
- `src/graph/`: renderer/layout only.
- `src/styles/`: design tokens and app styling.

Future production pipeline should live under `pipeline/` and use Python + `uv`.

## Stable data-driven layout

Hero coordinates are generated offline and committed as a patch-scoped snapshot.

The layout build:
- reads the canonical hero catalog;
- derives weighted hero-pair affinities from approved real matchup evidence;
- runs a deterministic force-directed solver;
- performs deterministic collision relaxation;
- writes fixed coordinates and layout-quality/provenance metadata.

The browser never runs a force simulation. Overview, hover, and focus reuse the same stable coordinates, so graph topology does not jump between page loads.

Real-data layout affinity is separate from the public counter-ranking contract. Changing how the graph is arranged must not silently change what `A -> B` means or promote a relationship into the product.

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
