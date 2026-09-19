# Architecture

## Current frontend architecture

The current implementation uses React + TypeScript + Vite with a deterministic SVG graph renderer.

SVG is deliberately used because the 127-hero graph remains small enough for deterministic DOM rendering while custom portrait nodes, arrowheads, edge labels, keyboard focus, and accessibility remain straightforward.

The domain model and relationship selection logic are independent from the renderer. A Sigma.js + Graphology spike was completed and the project chose to keep the deterministic SVG renderer for the current graph because it is smaller and better aligned with source-owned label layout, DOM accessibility, and deterministic testing. A future renderer change remains possible if graph scale materially changes.

See `docs/adr/0001-graph-renderer.md`.

## Boundaries

- `src/domain/`: semantic types and pure relationship logic.
- `src/data/`: hero identity metadata, production snapshot conversion, runtime validation, and the asynchronous frontend loading boundary.
- `src/components/`: Search, contextual cards, and shared portrait-asset state.
- `src/graph/`: renderer/layout only.
- `src/styles/`: design tokens and app styling.

The production data pipeline lives under `pipeline/` and uses Python + `uv`.

## Stable data-driven layout

Hero coordinates are generated offline from the same current-patch relationships used by the product and committed inside the daily production snapshot.

The layout build:
- reads the canonical hero catalog;
- derives weighted hero-pair affinities from approved real matchup evidence;
- runs a deterministic force-directed solver;
- performs deterministic collision relaxation;
- writes fixed coordinates and layout-quality/provenance metadata.

The browser never runs a force simulation. Overview, hover, and focus reuse the same stable coordinates, so graph topology does not jump between page loads.

Layout uses confidence-qualified current-patch relationships, but geometry remains separate from relationship semantics. Changing layout parameters must not change what `A -> B` means or alter the user-visible win rate.

## Static hosting

The product targets GitHub Pages. Graph state uses query parameters so direct refresh does not require server routing.

Examples:
- `?hero=viper`
- `?hero=viper&matchup=shadow-demon`

## Data boundary

The frontend does not render provider responses directly. GitHub Actions publishes `public/data/current-matchups.json`; `loadDataset` fetches it as a static asset, converts stable internal hero slugs to UI hero IDs, and passes the complete result through runtime validation before React receives it.

Loading and validation are intentionally explicit:
- while the bundle is pending, the graph is not presented as ready;
- malformed bundles block the graph instead of exposing partial relationships;
- a validated stale bundle remains usable with a visible warning;
- load failures expose a retry state.

Production observations retain explicit direction, raw source win rate, sample size, baseline-adjusted delta, internal ranking score, patch, rank scope, provenance, observation window, and generation metadata.

The current OpenDota pipeline runs daily in GitHub Actions. Structured test/generation logs are retained as workflow artifacts. Provider availability is therefore a build-time concern; the published static frontend never depends on a live OpenDota request.

## Portrait asset boundary

All hero portraits come from one local WebP atlas. `PortraitProvider` performs one deduplicated fetch and decode check, including under React StrictMode.

Once ready, components and the SVG graph use the decoded atlas through a local object URL. If the request or decode fails, the graph and cards keep their dimensions and switch to text fallbacks while the UI shows a non-blocking portrait warning.
