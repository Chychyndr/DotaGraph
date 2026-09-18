# Current implementation status

Snapshot date: 2026-09-18.

## Repository

- Repo: https://github.com/Chychyndr/DotaGraph
- Default branch: `main`
- Main HEAD at snapshot: `430725c082d8f4ea98a64786450ea55d851fd8bf`
- Open PRs at snapshot: none
- Permanent tracker: issue #8

## Frontend stack

Runtime:
- React 19.1.1
- React DOM 19.1.1

Build/dev:
- TypeScript 5.9.2
- Vite 7.1.5
- Vitest 3.2.4
- Playwright 1.55.0
- Testing Library
- jsdom
- Impeccable 3.2.1
- sharp 0.35.4 for hero-atlas generation

No Sigma/Graphology dependency remains in production after the renderer spike.

## Architecture

Current renderer: deterministic SVG.

Important boundaries:
- `src/domain/` — semantic types and pure relationship logic;
- `src/data/` — fixtures, hero metadata, scope;
- `src/components/` — search and cards;
- `src/graph/` — layout/renderer;
- `src/styles/` — tokens and app styling;
- future `pipeline/` — Python + uv data build.

The renderer must stay behind a focused boundary so domain semantics do not depend on SVG-specific objects.

## Current dataset state

- 127 current heroes are represented.
- Current matchup statistics are development fixtures only.
- The current fixture relationship graph has 23 directed relationships in the renderer spike evidence.
- Production ingestion has not started.
- Matchups below configured minimum sample are filtered before selection.
- Focus takes at most five incoming and five outgoing relationships.
- Hero aliases live in metadata.

## Portrait path

Runtime uses one local `heroes-atlas.webp` request.

Build step:
- downloads current upstream portraits;
- crops to 96×96;
- packs 127 portraits into a 16×8 WebP atlas;
- generated atlas is not committed;
- Pages/CI cache is keyed so repeated builds usually avoid re-downloading.

PR #11 reported atlas size: 266 KiB.

## Implemented interaction

- overview/hover/focus/matchup;
- deterministic full-roster layout;
- drag pan;
- pointer-centered wheel zoom;
- click empty graph to reset;
- smooth focus camera;
- manual pan/zoom cancels camera animation;
- query URL state;
- keyboard search;
- roving graph Tab stop;
- spatial Arrow-key graph navigation;
- Enter/Space activation;
- live state announcements;
- reduced-motion camera behavior;
- compact mobile/tablet viewport handling.

## Deployment

Live site:
https://chychyndr.github.io/DotaGraph/

Required repository Pages setting:
`Settings -> Pages -> Build and deployment -> Source -> GitHub Actions`

Deployment:
1. main CI passes;
2. exact tested SHA is checked out;
3. Vite builds with `base=/DotaGraph/`;
4. artifact is validated and deployed;
5. fresh Chromium opens the public URL;
6. page must expose the expected build SHA;
7. blank root, missing heading, JS errors, console errors, failed same-origin requests, or stale build marker fail verification.

## Recent merged work

- PR #1 — initial UX foundation.
- PR #2 — UI cleanup, pan/zoom/empty reset.
- PR #3 — visual simplification and camera polish.
- PRs #4–#6 — GitHub Pages root-cause fixes and exact-build browser verification.
- PR #7 — chosen DotaGraph logo.
- PR #9 — remove project version labels.
- PR #10 — complete 127-hero roster.
- PR #11 — one local WebP portrait atlas.
- PR #12 — source-anchored collision-aware labels.
- PR #13 — Sigma/Graphology spike; retain SVG.
- PR #14 — responsive/accessibility hardening.
- PR #15 — stabilize keyboard-navigation E2E check.

## Latest reported checks

PR #14:
- TypeScript passed;
- Impeccable passed;
- 15 unit tests passed;
- 25 Playwright/Chromium tests passed;
- Pages artifact verification passed.

PR #15 changed the E2E navigation assertion so it tries valid spatial directions rather than assuming one hard-coded direction exists.

## Active gap

The next UI reliability work is explicit states for:
- loading;
- stale data;
- malformed data;
- portrait failure.

After that, the major unresolved work is source/legal/methodology approval and production data ingestion.
