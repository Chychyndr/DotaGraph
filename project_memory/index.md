# DotaGraph project memory

This directory is the durable context layer for AI-assisted work on DotaGraph.

It is intentionally smaller than a chat transcript. Store decisions, constraints, current state, evidence, and handoff information that a future agent actually needs.

## Read order

For a fresh session:

1. Read `AGENTS.md`.
2. Read this file.
3. Read `handoff.md`.
4. Read only the relevant files under `active/`.
5. Use `knowledge-graph.md` when relationships between decisions/components matter.
6. Verify volatile facts against GitHub, source docs, or the current code before changing them.

## Memory map

- [handoff.md](./handoff.md) — fastest resume point and current work state.
- [active/product.md](./active/product.md) — durable product, UX, scope, and owner decisions.
- [active/decisions.md](./active/decisions.md) — accepted technical/product decisions and rationale.
- [active/status.md](./active/status.md) — current repository implementation state and validation evidence.
- [knowledge-graph.md](./knowledge-graph.md) — human-readable relationship graph for project context.

## Source-of-truth precedence

Memory never overrides stronger project sources.

For visual decisions:
1. owner-approved Figma;
2. `DESIGN.md`;
3. approved screenshots/UX decisions;
4. `AGENTS.md`;
5. this memory.

For implementation facts:
1. current code and tests;
2. accepted ADRs and living docs;
3. merged PRs/issues;
4. this memory.

For owner decisions captured from chat, this memory may preserve context that has not yet been promoted into another living document. Mark such facts clearly and promote them into the correct project doc when they become implementation-relevant.

## Update rules

Update memory when a meaningful change lands in any of these areas:
- product scope or owner constraint;
- architecture or renderer;
- data methodology or source policy;
- deployment;
- UX behavior;
- important bug/root cause;
- current task or blocker.

Do not dump raw conversations here. Distill durable information.

When a decision changes, preserve the superseded decision in `active/decisions.md` with a clear replacement note instead of silently rewriting history.

Keep `handoff.md` short enough to read at session start.
