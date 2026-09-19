# DotaGraph

DotaGraph is an open-source, graph-first Dota 2 matchup project.

DotaGraph is built for ordinary players who want to answer two questions quickly during a draft: who counters this hero, and whom does this hero counter?

The public graph uses generated current-patch matchup statistics. The headline percentage is the real source hero win rate for the published OpenDota Ancient+ scope.

## Run locally

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

GitHub Pages deployment uses a compiled Vite artifact. See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for the required repository setting and deployment checks.

## Product rules

- `A -> B` always means A counters B.
- Focus view shows 0–5 reliable incoming and 0–5 reliable outgoing relationships.
- The displayed percentage is the source hero's matchup win rate.
- The current product scope contains heroes and hero-vs-hero counter relationships only.
- Headline scope is Ancient+ and the current patch supplied through data/configuration.
- Current matchup data is regenerated daily by GitHub Actions and published as static JSON.

Read [AGENTS.md](./AGENTS.md) before contributing.

## Design references

Figma:
https://www.figma.com/design/rydgq1wV8C0hlVb5n7Ohws/DotaGraph-Design?node-id=1-2&t=4TqWKwISZRk837Bf-0

Interaction reference:
https://claude.ai/public/artifacts/ddbdfd38-f9ac-4261-a764-cdbac4e405ec

The Claude artifact is an interaction reference only. DotaGraph has its own visual language.

## Status

DotaGraph now has a real current-patch data path.

For patch **7.41f**:
- headline data comes from OpenDota `public_matches`;
- observation window begins at `2026-09-16T00:00:00Z`;
- headline scope is Ancient+ using `avg_rank_tier >= 60`, ranked all-draft matches;
- a hero pair needs at least 500 qualifying matches;
- the displayed percentage is the raw source-hero matchup win rate;
- counter ordering uses the documented baseline-adjusted one-sided 95% lower confidence bound;
- the same eligible relationships drive deterministic offline graph geometry;
- generated data is refreshed daily through GitHub Actions;
- pipeline test/generation logs are uploaded as workflow artifacts;
- a successful data commit triggers normal CI, GitHub Pages deployment, and live Chromium verification.

The frontend fetches `public/data/current-matchups.json` at runtime and validates it before rendering. A snapshot older than 36 hours is still usable but is visibly marked stale.

Canonical sample-size semantics and counter-ranking methodology are documented in [docs/METHODOLOGY.md](./docs/METHODOLOGY.md).

Owner-approved direct Dota data sources are **OpenDota, STRATZ, DOTABUFF, and Dota2ProTracker**. OpenDota is currently the reproducible headline numeric source; the other sources remain available for compatible detailed/cross-source evidence under their documented access constraints.

Cross-source aggregation/disagreement rules and richer detailed provenance are the next data-methodology work.
