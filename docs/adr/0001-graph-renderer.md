# ADR 0001: graph renderer

Status: accepted.

## Context

DotaGraph needs:
- 127 current hero nodes;
- directed counter edges;
- portrait nodes;
- tiny directional arrows;
- source-owned win-rate labels;
- deterministic positions;
- hover, focus and matchup states;
- mouse pan and wheel zoom;
- animated camera focus;
- keyboard/accessibility support;
- deterministic browser and screenshot tests;
- room to grow to denser relationship data later.

The existing renderer is deterministic SVG. Sigma.js + Graphology was the main alternative because Sigma is designed for large graph visualization with WebGL and Graphology provides a mature graph data structure.

## Spike

A working comparison was implemented on an isolated `?renderer=sigma` path using:
- Sigma 3.0.3;
- Graphology 0.26.0;
- `@sigma/node-image` 3.0.0.

The spike exercised:
- all 127 hero nodes;
- all current reliable directed relationships;
- arrow rendering;
- pan and zoom;
- node hit testing;
- click/hover interactions;
- selected, active, dimmed and matchup states;
- animated camera focus;
- hero portrait textures;
- Chromium end-to-end verification.

The Graphology adapter preserved node and edge parity with the DotaGraph domain model. Chromium verification passed with the complete graph.

## Evidence

### Rendering capability

Sigma handled the current graph size easily and its built-in camera and interaction model are strong.

Its WebGL renderer is a better scaling foundation if DotaGraph eventually needs thousands of simultaneously visible nodes or a very large number of edges.

### Bundle cost

The production build before the spike was:

- JavaScript: 248.64 kB;
- gzip: 78.89 kB.

With Sigma, Graphology and the image-node renderer included, the comparison build was:

- JavaScript: 439.01 kB;
- gzip: 127.59 kB.

That adds about 190.37 kB of JavaScript, or 48.70 kB gzip, before the graph needs that additional rendering capacity.

### Portrait pipeline

The current SVG renderer reads hero portraits directly from the single local WebP atlas.

Sigma's image-node renderer expects per-node image sources and then builds its own texture atlas. To preserve DotaGraph's one-request portrait pipeline, the spike had to crop the existing atlas into 127 in-memory image sources and let Sigma pack those images again.

That works, but introduces redundant decoding, memory use and renderer-specific asset plumbing.

### Win-rate labels

DotaGraph deliberately places each percentage on the source side of a directed relationship so users can understand whose win rate is shown without extra text.

The current SVG renderer can use the existing collision-aware source-side label layout directly.

Sigma can render edge labels, but reproducing DotaGraph's source-side pill labels and collision rules would require a custom drawing layer or a synchronized DOM/canvas overlay. That would reintroduce much of the custom renderer complexity that Sigma is supposed to remove.

### Accessibility and testing

SVG keeps every hero as a focusable DOM element and keeps graph semantics inspectable by browser tests.

Sigma renders the graph primarily into canvas/WebGL layers. Equivalent per-node accessibility would require maintaining a parallel accessible DOM representation.

The SVG output is also easier to inspect and compare deterministically in Playwright screenshots.

## Decision

Keep the deterministic SVG renderer as the production renderer.

Do not ship Sigma.js or Graphology in the current frontend.

Keep domain and renderer boundaries clean so a later renderer migration remains possible.

## Revisit criteria

Re-run the renderer decision if one or more of these become true:
- the graph must display roughly 500+ nodes at once;
- the normal view reaches thousands of simultaneously visible edges;
- SVG interaction or rendering performance becomes measurably poor on supported hardware;
- item, synergy or draft layers require a graph substantially larger than the hero-counter graph;
- profiling shows the renderer, rather than data/network work, is a meaningful user-facing bottleneck.

If those conditions appear, Sigma remains the preferred first candidate.

## Consequences

The experimental Sigma implementation should not remain in the production bundle after the spike.

The current SVG renderer remains behind the graph-specific module boundary. Domain semantics, relationship direction and data structures must stay renderer-independent.
