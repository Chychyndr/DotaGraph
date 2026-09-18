# DotaGraph

DotaGraph is an open-source, graph-first Dota 2 matchup project.

DotaGraph is built for ordinary players who want to answer two questions quickly during a draft: who counters this hero, and whom does this hero counter?

The current frontend uses development fixture statistics for interface work. They must not be treated as real Dota statistics.

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
- Production data ingestion has not started.

Read [AGENTS.md](./AGENTS.md) before contributing.

## Design references

Figma:
https://www.figma.com/design/rydgq1wV8C0hlVb5n7Ohws/DotaGraph-Design?node-id=1-2&t=4TqWKwISZRk837Bf-0

Interaction reference:
https://claude.ai/public/artifacts/ddbdfd38-f9ac-4261-a764-cdbac4e405ec

The Claude artifact is an interaction reference only. DotaGraph has its own visual language.

## Status

The graph/frontend foundation and the first full source/licensing review are complete.

Hero **geometry** is now generated from real patch 7.41e OpenDota matchup evidence: related counter/countered heroes influence a deterministic offline layout, then the frontend uses the committed coordinates without a runtime force simulation.

The currently displayed matchup percentages/relationship fixtures are still development fixtures. The real-data layout does not turn its internal geometric affinity into a public counter score.

Canonical sample-size semantics are documented: one distinct completed match per source observation, with a 500-match normal-candidate minimum and no cross-provider count summing.

Owner-approved direct Dota data sources are **OpenDota, STRATZ, DOTABUFF, and Dota2ProTracker**. Official APIs are preferred where available; direct-source approval does not override provider authentication, rate limits, or anti-scraping restrictions.

The next statistical methodology task is counter-ranking methodology, followed by aggregation/disagreement rules and freshness handling. Production headline matchup statistics remain blocked by those methodology decisions; the allowed direct-source set itself is now approved.
