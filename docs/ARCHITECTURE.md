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

Hero coordinates are generated offline from real current-patch matchup observations and committed inside the regenerated production snapshot. Geometry is deliberately separate from the stricter headline-counter publication gate.

The layout build:
- reads the canonical hero catalog;
- derives primary affinity candidates from current-patch OpenDota pair observations with the normal 500-match sample floor but without the one-sided 95% headline confidence penalty;
- keeps up to five strongest real incident affinities per hero;
- when a rare hero would otherwise have fewer than two geometry neighbors, may use geometry-only current-patch observations down to the explicit 100-match fallback floor;
- never publishes those geometry-only fallback edges as counters or uses them to change displayed percentages;
- runs a deterministic force-directed solver;
- pulls low-degree heroes toward the centroid of their real affinity neighbors so they do not become detached hull islands;
- performs deterministic collision relaxation with a 58 px minimum center distance;
- applies a final uniform presentation-spread pass, capped at 1.18×, so the stable topology uses more of the 1200×760 graph canvas without changing relative angles;
- writes fixed coordinates plus spacing, isolation, and edge-distance quality metrics.

The browser never runs a force simulation. Overview, Hover, Focus, and Matchup all use the same committed stable hero coordinates after that spread pass. Desktop Focus keeps the Overview camera scale and anchor as well as the node positions; it may apply only a small translation to make room for the context card. Compact Focus may reframe that same coordinate system for the context card. No interaction state derives a second set of node positions.

The SVG renderer keeps one persistent focus-eligible relationship graph in the DOM. Overview renders the union of every relationship that can become one of any hero's top incoming/outgoing Focus edges at very low contrast. Hover and Focus only change emphasis on those existing lines; selecting a hero never inserts a second edge set, substitutes endpoints, or creates a focus overlay. Up to five incoming and five outgoing relationships become prominent while unrelated heroes are dimmed in place. Lower-ranked eligible statistical pairs that can never enter the current Focus limit stay out of the SVG background web. This preserves one continuous graph throughout the interaction without changing counter semantics.

Changing layout parameters must not change what `A -> B` means, alter the user-visible source win rate, or promote geometry-only evidence into the headline counter set.

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

Production headline observations retain explicit direction, raw source win rate, sample size, baseline-adjusted delta, internal ranking score, patch, rank scope, provenance, observation window, and generation metadata. Detail-only evidence travels through the same validated bundle as separate `MatchupEvidenceObservation` records and never mutates headline relationships.

The current OpenDota pipeline targets regeneration every 12 hours in GitHub Actions. Its Explorer query also derives an `avg_rank_tier >= 80` Immortal subset with conditional aggregates, avoiding a second provider request. Structured test/generation logs are retained as workflow artifacts. Provider availability is therefore a build-time concern; the published static frontend never depends on a live OpenDota request.

## Portrait asset boundary

All hero portraits come from one local WebP atlas. `PortraitProvider` performs one deduplicated fetch and decode check, including under React StrictMode.

Once ready, components and the SVG graph use the decoded atlas through a local object URL. If the request or decode fails, the graph and cards keep their dimensions and switch to text fallbacks while the UI shows a non-blocking portrait warning.
