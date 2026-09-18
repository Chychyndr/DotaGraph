# Roadmap

Roadmap order describes dependency and product logic, not release dates.

## Milestone 1 — UX foundation

- graph-first frontend;
- Overview / Hover / Focus / Matchup states;
- search and aliases;
- up to five reliable relationships per direction;
- source-side win-rate labels;
- compact HeroCard / MatchupCard;
- fixture-only data;
- tests and GitHub Pages deployment.

## Milestone 2 — renderer and visual hardening

- validate the current SVG UX with owner review;
- compare source-side win-rate label variants;
- test full 127+ hero density;
- run Sigma.js + Graphology spike;
- choose long-term renderer;
- improve viewport behavior and accessibility;
- performance budgets.

## Milestone 3 — source/legal methodology gate

- finalize source registry;
- verify current API/data terms;
- approve source adapters;
- define canonical sample-size semantics;
- define counter-ranking methodology;
- define stale/current-patch handling.

No production ingestion starts before this gate is approved.

## Milestone 4 — current production hero data

- source adapters;
- Python + uv pipeline;
- normalization;
- aggregation;
- counter ranking;
- validation;
- current-patch generated bundle;
- detailed source provenance.

## Milestone 5 — reviewed explanations

- AI-assisted drafts;
- source-linked evidence;
- human review workflow;
- patch re-verification;
- contributor editing path.

## Later layers

Only after the hero-counter product is strong:
- Item -> Hero layer;
- Synergies;
- counter-counter responses;
- draft/team analysis;
- translations.

Future layers must remain separate modes rather than making one unreadable mega-graph.
