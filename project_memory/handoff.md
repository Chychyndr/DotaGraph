# DotaGraph handoff

Last refreshed: 2026-09-18  
Repository: https://github.com/Chychyndr/DotaGraph  
Default branch: `main`  
Main HEAD at refresh: `430725c082d8f4ea98a64786450ea55d851fd8bf`

## Current state

The frontend foundation is implemented and deployed. Merged work through PR #15 includes:

- React + TypeScript + Vite static frontend;
- graph-first Overview / Hover / Focus / Matchup states;
- strict `A -> B = A counters B` semantics;
- 0–5 incoming and 0–5 outgoing relationships in Focus;
- source-owned win-rate labels;
- search aliases and query-parameter URL state;
- compact HeroCard and MatchupCard;
- pan, pointer-centered wheel zoom, empty-space reset, and camera focus transitions;
- 127 current heroes;
- one generated local WebP portrait atlas instead of 127 runtime Steamstatic requests;
- collision-aware source-side percentage labels;
- completed Sigma.js + Graphology renderer spike and accepted decision to retain SVG;
- responsive and accessibility hardening including roving graph focus, spatial Arrow-key navigation, live announcements, compact-screen containment, and reduced-motion behavior;
- GitHub Pages CI/deployment verification in a real Chromium session.

There are currently no open pull requests.

## Current task

Permanent tracker: https://github.com/Chychyndr/DotaGraph/issues/8

Current task from the tracker:

> Add explicit loading / stale / malformed-data / portrait-failure states.

Do not begin production statistics ingestion before the source/legal/methodology gate is approved.

## Next project gates

After the current UI-state task:

1. Finish source + licensing review for production providers.
2. Approve canonical sample-size semantics.
3. Approve counter-ranking methodology.
4. Approve aggregation and cross-source disagreement rules.
5. Define current-patch freshness/staleness rules.
6. Build the Python + uv production pipeline.
7. Add approved source adapters.
8. Generate a validated current-patch matchup bundle.
9. Add source/provenance breakdown.
10. Replace fixture matchup values only after the above is ready.

## Critical invariants

- `A -> B` always means A counters B.
- The displayed edge percentage is A's win rate against B.
- Focus shows up to 5 reliable relationships per direction; zero is valid.
- Planned minimum sample is 500 matches in the relevant scope until explicitly changed.
- Initial headline rank scope is Ancient+.
- No rank selector in the simple current product.
- Public data represents only the current patch; planning patch at kickoff was 7.41e, stored as data/configuration.
- Fixture percentages are development-only and must never be presented as real Dota statistics.
- English is the public product language for now; localization is later.
- The graph is the primary surface and should stay visually calm.
- Items, synergies, accounts/auth, analytics, historical patch browsing, and a mandatory backend are outside current scope.
- AI may draft explanation prose but may not act as a source or self-approve explanations.
- Production numeric data is generated, provenance-preserving, and never hand-edited.
- Python tooling uses uv, never pip.

## Renderer decision

PR #13 compared SVG with Sigma 3.0.3 + Graphology 0.26.0 using all 127 heroes.

Measured comparison:
- SVG build: 248.64 kB JS / 78.89 kB gzip;
- Sigma spike: 439.11 kB JS / 127.63 kB gzip;
- additional gzip: 48.74 kB;
- first Sigma render in CI Chromium: 4.2 ms before portrait texture preparation.

Accepted decision: keep deterministic SVG. Revisit when graph size/performance materially changes.

## Latest validation evidence

PR #14 reported:
- TypeScript passed;
- Impeccable detector passed;
- 15 unit tests passed;
- 25 Playwright/Chromium tests passed;
- Pages artifact verification passed;
- responsive screenshots produced and reviewed.

PR #15 stabilized the keyboard-navigation E2E assumption without changing the accessibility implementation.

## Key references

- Figma: https://www.figma.com/design/rydgq1wV8C0hlVb5n7Ohws/DotaGraph-Design?node-id=1-2&t=4TqWKwISZRk837Bf-0
- Interaction reference: https://claude.ai/public/artifacts/ddbdfd38-f9ac-4261-a764-cdbac4e405ec
- Live site: https://chychyndr.github.io/DotaGraph/
- Tracker: https://github.com/Chychyndr/DotaGraph/issues/8
- Renderer ADR: `docs/adr/0001-graph-renderer.md`

## Session-start reminder

Before changing behavior, re-read the relevant living project doc and inspect the current implementation. This file is a resume aid, not permission to trust stale assumptions.
