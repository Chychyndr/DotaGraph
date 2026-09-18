# ADR 0001: first graph renderer

Status: accepted for the first UX milestone.

## Context

DotaGraph ultimately needs custom portrait nodes, directed edges, win-rate labels, hover/focus styling, deterministic layout, camera control, accessibility fallback, and room for a larger relationship graph.

Sigma.js + Graphology is the leading long-term candidate.

## Decision

Use a deterministic SVG renderer for the first UX milestone behind a graph-specific module boundary.

## Why

The first milestone validates product semantics rather than maximum graph scale.

SVG makes these prototype requirements simpler:
- image nodes;
- tiny arrowheads;
- edge labels;
- accessible DOM;
- deterministic positioning;
- screenshot testing;
- rapid visual iteration.

The fixture graph remains intentionally small.

## Consequences

Do not leak SVG-specific types into domain/data modules.

After UX stabilizes, run a Sigma.js + Graphology spike against:
- 127+ hero nodes;
- future hundreds/thousands of edges;
- portrait textures;
- active/dim state;
- tiny directed arrows;
- source-side labels;
- deterministic layout;
- camera focus;
- hit testing;
- accessibility fallback.

If Sigma is adopted, replace only the renderer adapter and keep domain semantics unchanged.
