# Contributing to DotaGraph

Thanks for helping improve DotaGraph.

Read `AGENTS.md` before making changes. It contains the product contract, graph semantics, source policy, design priorities, and agent-skill guidance.

## Local setup

```bash
npm install
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

The current frontend uses fixture statistics for UX development.

Do not submit manually invented values as production statistics.

When the production pipeline exists, generated numeric data must be corrected through source/pipeline/methodology changes and regeneration rather than hand editing.

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
