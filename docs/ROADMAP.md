# Roadmap

Roadmap order describes dependency and product logic, not release dates.

## UX foundation

Completed:
- graph-first frontend;
- Overview / Hover / Focus / Matchup states;
- search and aliases;
- up to five reliable relationships per direction;
- source-side real win-rate labels;
- compact HeroCard / MatchupCard;
- tests and GitHub Pages deployment.

## Completed frontend hardening

- deterministic SVG renderer retained after the Sigma.js + Graphology spike;
- source-anchored, collision-aware win-rate labels;
- full 127-hero density validation;
- responsive viewport and accessibility hardening;
- adaptive focus framing;
- single local hero portrait atlas with explicit failure fallback;
- loading, stale, malformed-data, and unavailable-data states;
- CI, Playwright, Impeccable, and GitHub Pages verification.

## Completed data-methodology foundation

- source registry reviewed;
- OpenDota, STRATZ, DOTABUFF, and Dota2ProTracker approved as direct-source family with access constraints preserved;
- canonical sample-size semantics approved;
- 500-match minimum per source observation;
- baseline-adjusted conservative counter-ranking methodology approved;
- one-sided 95% lower confidence ranking bound implemented/tested;
- user-facing statistic remains raw source-hero matchup win rate;
- generated snapshot becomes stale after 36 hours without refresh;
- provider sample sizes remain separate.

## Current production hero data

Implemented in #28 / PR #29:
- Python + uv production pipeline;
- OpenDota Explorer adapter with retries/time-range splitting;
- structured debug logs;
- normalization;
- current-patch baseline calculation;
- counter ranking;
- validation;
- deterministic data-driven layout;
- current-patch generated bundle;
- daily GitHub Actions refresh;
- static runtime loading from `public/data/current-matchups.json`;
- source/provenance metadata;
- automatic CI -> Pages -> live browser verification after data commits.

## Next data work

- approve cross-source aggregation/disagreement rules;
- add STRATZ compatible detail observations;
- add manually/provider-compatibly sourced DOTABUFF and Dota2ProTracker evidence where useful;
- expose richer source/provenance breakdown in details;
- add separate Immortal/pro evidence where available;
- automate current-patch detection/update workflow when a reliable primary signal is chosen.

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
