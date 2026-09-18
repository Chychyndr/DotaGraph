# Roadmap

Roadmap order describes dependency and product logic, not release dates.

## UX foundation

- graph-first frontend;
- Overview / Hover / Focus / Matchup states;
- search and aliases;
- up to five reliable relationships per direction;
- source-side win-rate labels;
- compact HeroCard / MatchupCard;
- fixture-only data;
- tests and GitHub Pages deployment.

## Renderer and visual hardening

- validate the current SVG UX with owner review;
- compare source-side win-rate label variants;
- test full 127+ hero density;
- run Sigma.js + Graphology spike;
- choose long-term renderer;
- improve viewport behavior and accessibility;
- performance budgets.

## Source/legal methodology gate

- source registry reviewed on 2026-09-18;
- current API/data terms reviewed for Valve/Steam, OpenDota, STRATZ, DOTABUFF, Dota2ProTracker, and community sources;
- obtain explicit permission/terms for any conditional hosted provider before production ingestion;
- approve source adapters only after the exact caching/derived-publication rights and scope are clear;
- define canonical sample-size semantics;
- define counter-ranking methodology;
- define stale/current-patch handling.

No production statistical ingestion starts before both the source-rights decision and methodology gates are approved.

## Current production hero data

- source adapters;
- Python + uv pipeline;
- normalization;
- aggregation;
- counter ranking;
- validation;
- current-patch generated bundle;
- detailed source provenance.

## Reviewed explanations

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
