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

The graph/frontend foundation and the first full source/licensing review are complete. The current UI still uses development fixtures.

The next data-methodology task is to approve canonical sample-size semantics, followed by counter ranking, aggregation/disagreement rules, and freshness handling. Production statistical ingestion remains blocked until both methodology and the exact provider rights/scope are approved.
