# Contributing to DotaGraph

Thanks for helping improve DotaGraph.

Read `AGENTS.md` before making changes. It contains the product contract, graph semantics, source policy, design priorities, and agent-skill guidance.

## Local setup

```bash
npm ci
npm run dev
```

Before opening a pull request:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Contribution lanes

Useful contributions include:
- graph/frontend UX;
- accessibility;
- performance;
- tests;
- documentation;
- source/licensing research;
- future source adapters;
- methodology;
- reviewed matchup explanations.

## Core semantic rule

`A -> B` always means A counters B.

If you touch graph/domain logic, add or update tests for direction, win-rate ownership, sample filtering, and deterministic ordering.

## Data changes

The production frontend loads generated current-patch statistics from `public/data/current-matchups.json`; test-only fixtures stay outside the production load path.

Do not submit manually invented values as production statistics.

Generated numeric data must be corrected through source/pipeline/methodology changes and regeneration rather than hand editing.

## External sources

Do not add a scraper or automated data source without first updating `docs/SOURCES_AND_LICENSING.md` and getting owner approval.

Public visibility is not permission to scrape.

## Design

Figma is the visual source of truth:
https://www.figma.com/design/rydgq1wV8C0hlVb5n7Ohws/DotaGraph-Design?node-id=1-2&t=4TqWKwISZRk837Bf-0

Keep the UI graph-first, calm, and fast. Avoid generic dashboard styling and extra controls without a clear draft-time use case.

## Pull requests

Keep PRs focused. Explain:
- what changed;
- why;
- screenshots for visual changes;
- tests run;
- whether data/methodology/source policy changed.

Do not mix unrelated refactors with feature work.

## Collect verified Immortal evidence

On a machine authorized to use the STRATZ API, set `STRATZ_API_TOKEN` in the
process environment and run from the repository root:

```bash
uv run --locked --project pipeline python scripts/collect_immortal.py
```

This writes aggregate evidence to `artifacts/immortal/current-matchups.json`.
It atomically saves after each completed interval, preserving progress if a later
request fails. Resume with `--input artifacts/immortal/current-matchups.json`.
It processes up to four intervals of 20,000 OpenDota medal-75 candidates each,
checks exact rank and patch through STRATZ, and prints actual accepted counts
and remaining backlog. It preserves the existing headline observations.
The scheduled production refresh uses the same collector for one interval.
The manual `Collect verified Immortal evidence` GitHub Actions workflow writes
the generated aggregate and log as downloadable artifacts when its runner has
provider-authorized access.
After reviewing the output, replace `public/data/current-matchups.json` with
that generated file and run the standard checks before submitting a data PR.
Never hand-edit statistics. Keep the token outside commands, committed files,
logs, and frontend code. HTTP 403 must be resolved through provider-authorized
network access; a successful schema query alone does not prove data access.

The live check on 2026-11-20 resolved the official bulk schema but failed data
access from two GitHub Actions runs with an IP-related HTTP 403. No Immortal
matches from those attempts were published. The collection implementation
must not be described as a populated production dataset until a real run
succeeds and its generated aggregate is reviewed.
