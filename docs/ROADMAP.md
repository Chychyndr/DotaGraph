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

## Completed frontend hardening

Current completed results:
- deterministic SVG renderer retained after the Sigma.js + Graphology spike;
- source-anchored, collision-aware win-rate labels;
- full 127-hero density validation;
- responsive viewport and accessibility hardening;
- adaptive focus framing for distant active relationships;
- single local hero portrait atlas with explicit failure fallback;
- loading, stale, malformed-data, and unavailable-data states;
- CI, Playwright, Impeccable, and GitHub Pages verification.

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
