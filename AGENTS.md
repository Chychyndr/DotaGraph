# AGENTS.md — DotaGraph project contract

This file applies to the entire repository unless a deeper AGENTS.md explicitly narrows instructions for a subdirectory.

DotaGraph is an open-source, graph-first Dota 2 matchup knowledge project. It should become a reliable, explainable, current-patch tool that ordinary players can open during a draft while still preserving enough provenance and methodology for advanced users and contributors.

## Project and documentation naming

Do not label DotaGraph itself, its documentation, roadmap stages, public releases, or issues with release/status names such as `V1`, `V2`, `alpha`, `beta`, `test version`, `prototype version`, numbered milestones, or similar project-version labels.

Use plain scope language instead, such as:
- current scope;
- current implementation;
- next;
- later;
- planned;
- current frontend;
- current data work.

The word `test` remains valid only for actual automated/manual testing, test suites, test files, and verification work. Do not use `test` as a product, release, documentation, roadmap, or issue status.

Dependency, API, schema, runtime, and library version numbers may still be documented when technically necessary.

## Product priorities

Optimize in this order:

1. correctness and provenance;
2. fast comprehension during a live draft;
3. current-patch relevance;
4. simple, calm UX;
5. accessibility;
6. performance;
7. maintainability and contributor ergonomics;
8. deeper analytics;
9. decorative polish.

A feature that makes the graph look more impressive but slows comprehension is usually a regression.

## Core relationship rule

A -> B always means: A counters B.

This meaning must be identical in graph rendering, cards, URL state, data schema, explanations, tests, and documentation.

Never encode direction only through color.

## Visible relationship limits

A focused hero view may show 0–5 reliable relationships per direction.

Never force exactly five and never add weak relationships just to fill the UI.

The approved normal-candidate minimum is 500 qualifying matches per source observation in one exact statistical scope. Keep this threshold in methodology/configuration rather than scattering a magic number through the codebase.

One sample means one distinct completed match for the hero pair inside one source/patch/rank/match-population/observation-window scope. Never add counts from separate providers to cross the 500-match threshold.

If a hero has many meaningful counters, show the best up to five in the focused graph. The full dataset may contain far more relationships.

If there are no reliable relationships in a direction, show an intentional empty state.

## Displayed statistic vs ranking statistic

The normal user-facing percentage on an edge is source-hero matchup win rate.

Example: A -> B with 55.4% means A has a 55.4% win rate against B in the stated scope.

The internal method that decides whether A is a meaningful counter to B may use baseline hero strength, expected matchup win rate, matchup delta, sample size, cross-source agreement, source quality, scope compatibility, and freshness.

Do not expose an arbitrary "counter score" as if it were an objective probability.

## Product layers

The project may eventually contain:

- Hero counters;
- Item -> Hero counters;
- Hero synergies;
- counter-counter responses;
- multi-hero draft analysis.

The first/default layer is Hero counters.

Do not render all layers simultaneously. Future complexity must be handled through explicit layers or modes so the graph remains readable.

Do not over-generalize current code in anticipation of every future node type. Keep domain data separate from rendering adapters so future layers can be added cleanly.

## Current patch only

The public product represents the current Dota patch.

At the time this contract was written, the planning patch is 7.41e. Do not hardcode business logic around that exact string. Patch is configuration/data metadata.

When a new patch arrives:
- update data;
- re-verify explanations affected by mechanical changes;
- publish current data;
- replace the old current-state output.

There is no requirement for a public historical-patch archive unless the owner explicitly changes this decision.

## Rank scope

Initial headline statistics are Ancient+.

Do not add a rank selector unless explicitly requested.

Immortal/professional evidence belongs in detailed views as separate evidence and must not silently replace the Ancient+ headline statistic.

## UX principles

DotaGraph is used under time pressure.

Default experience:
- one dominant graph;
- obvious search;
- compact contextual card;
- details on demand.

Avoid:
- settings dashboards;
- giant sidebars;
- unnecessary filters;
- decorative metrics;
- control clutter.

Core states:
1. Overview
2. Hover
3. Focus
4. Matchup
5. Details as progressive future expansion

### Overview
- all current heroes;
- weak spiderweb;
- low-contrast edges;
- minimal labels;
- stable layout;
- search always visible.

### Hover
- reveal local context;
- no layout jump;
- no large panel.

### Focus
- selected hero prominent;
- the same Overview graph and committed hero coordinates remain in place;
- unrelated heroes stay visible but dimmed;
- 0–5 incoming relationships are highlighted;
- 0–5 outgoing relationships are highlighted;
- active relationship heroes are emphasized at their existing graph positions;
- hero names stay outside relationship paths;
- compact HeroCard.

### Matchup
- selected pair emphasized;
- HeroCard becomes MatchupCard;
- graph remains visible.

## Graph visual semantics

Incoming counter relationship:
- coral/red family;
- arrow points toward selected hero.

Outgoing relationship:
- cyan/blue family;
- arrow points from selected hero.

Selected hero:
- restrained gold accent.

Arrowheads:
- very small;
- readable;
- never visually dominant.

Win-rate label:
- must visually belong to the source hero;
- preferred placement is nearer the source end of the edge;
- use tabular numerals;
- do not cover portraits or arrowheads.

Background graph:
- remains visible in Overview, Hover, and Focus as the same graph context;
- Focus highlights active relationships and dims unrelated heroes without replacing or relayouting the graph;
- background edges stay low-contrast while active relationships become prominent;
- do not render hundreds of prominent arrows or labels at once.

No continuous drift or breathing animation.

## Design source of truth

Visual precedence:

1. owner-approved Figma;
2. root DESIGN.md;
3. owner-approved screenshots and UX decisions;
4. this AGENTS.md;
5. generic UI skills/library defaults.

Figma:
https://www.figma.com/design/rydgq1wV8C0hlVb5n7Ohws/DotaGraph-Design?node-id=1-2&t=4TqWKwISZRk837Bf-0

Interaction reference:
https://claude.ai/public/artifacts/ddbdfd38-f9ac-4261-a764-cdbac4e405ec

The Claude artifact is an interaction reference, not a pixel-perfect target.

Never use generative-image output as final hero art, item art, UI icons, screenshots, or product assets. Use lawful real assets with explicit provenance.

## Visual style

Target:
- dark tinted canvas;
- quiet surfaces;
- GitHub-like system font stack unless the owner-approved Figma changes it;
- coral incoming;
- cyan outgoing;
- restrained gold selected state;
- Dota portraits provide most of the color.

Avoid common AI frontend styling:
- purple/blue marketing gradients;
- excessive rounded cards;
- nested card soup;
- glassmorphism everywhere;
- fake neon glow;
- giant headings inside app chrome;
- decorative blobs;
- bounce animations;
- unnecessary badges.

A polished DotaGraph screen should become calmer after refinement, not busier.

## Accessibility

Every graph feature needs a textual equivalent or accessible path.

Required:
- semantic controls;
- keyboard search;
- visible focus states;
- sufficient contrast;
- reduced-motion support;
- no color-only meaning;
- accessible labels on hero interactions;
- HeroCard lists active relationships textually;
- no clickable divs without semantics.

If canvas/WebGL accessibility is limited, provide a parallel DOM representation for active relationships.

## Performance

The user may have seconds remaining in a draft.

Principles:
- static-first;
- graph ready quickly;
- optimized portrait assets;
- no continuous simulation after settle;
- deterministic/stable layout;
- avoid unnecessary rerenders;
- avoid large full-resolution artwork;
- no API dependency for already-published basic graph data.

Measure before micro-optimizing.

## Frontend architecture

Current direction:
- TypeScript strict;
- React;
- static-friendly build;
- GitHub Pages;
- deterministic SVG renderer for the current graph;
- CSS variables/tokens;
- intentionally small dependency set.

Sigma.js + Graphology was evaluated in a dedicated spike and is not the current renderer choice. Keep the renderer boundary clean so a future scale-driven change remains possible without rewriting domain logic. See `docs/adr/0001-graph-renderer.md`.

Do not install a global state library until ordinary React state/context is genuinely insufficient.

Do not install Tailwind by reflex. Use it only after an explicit design/maintenance decision.

Keep graph rendering behind a focused adapter/module. Domain relationships must not depend on Sigma-specific objects.

## Stable graph layout

The overview must not randomly reorganize on every page load.

Prefer deterministic/precomputed positions, seeded layout, or cached stable positions generated as part of the data build.

Hover and Focus must not relayout the graph. Hero coordinates are the committed Overview coordinates in every interaction state. On desktop, hero selection also keeps the Overview camera unchanged; selection changes emphasis, labels, active edges, and contextual cards only. Compact viewports may reframe the same graph when needed for the card.

## URL state

Production target is GitHub Pages.

Direct refresh must work under repository Pages.

Prefer static-host-safe graph state such as:
- ?hero=viper
- ?hero=viper&matchup=shadow-demon

Validate URL state. Invalid IDs must fail safely.

## Search

Hero aliases belong in hero metadata, never in a switch statement inside the UI.

Normalize case, whitespace, common punctuation, and known abbreviations.

Examples:
- pa -> Phantom Assassin
- pl -> Phantom Lancer
- qop -> Queen of Pain
- am -> Anti-Mage
- np -> Nature's Prophet
- wk -> Wraith King
- sb -> Spirit Breaker

Search must support keyboard navigation and Enter selection.

## Empty/error states

Explicitly design and test:
- no reliable incoming counter;
- no reliable outgoing counter;
- 0/0 relationships;
- long hero names;
- failed portrait;
- malformed dataset;
- stale dataset;
- loading;
- source disagreement in detailed view.

Never replace missing data with fake relationships.

## Data boundary

Frontend consumes validated generated data.

Every production relationship/observation must retain:
- source hero;
- target hero;
- source win rate;
- sample size;
- patch;
- rank scope;
- provenance;
- generation/collection metadata.

Never infer direction from array position or color.

Use schema versioning for generated data.

## Future data pipeline

The production pipeline should live outside normal frontend runtime, likely under pipeline/.

Python rule: use uv, never pip.

Pipeline responsibilities:
- source adapters;
- bounded retries and rate limiting;
- structured debug logging;
- normalization;
- aggregation;
- ranking;
- validation;
- output generation;
- provenance;
- current-patch update.

Current production data is regenerated daily through GitHub Actions. Generation logs must remain downloadable as workflow artifacts, and ordinary frontend runtime must not depend on live provider availability.

Do not write one monolithic scraper. Keep source adapters isolated and tested.

## Source/licensing gate

The current provider review is recorded in `docs/SOURCES_AND_LICENSING.md` and was completed on 2026-09-18. Re-check the exact provider entry before any adapter or data-use change.

Each source entry must record:
- source URL;
- access method;
- license/terms;
- authentication;
- rate limits;
- automation status;
- caching status;
- redistribution status;
- attribution requirements;
- review date.

Never use "publicly visible on the web" as proof that scraping is permitted.

Current decisions:
- **OpenDota dotaconstants:** approved for static identity/constants metadata under MIT.
- **OpenDota hosted API:** owner-approved direct statistical source. Prefer the official API/Explorer; retain exact scope and provenance.
- **STRATZ GraphQL API:** owner-approved direct statistical source. Use the official token-authenticated API; keep tokens server-side/pipeline-only.
- **DOTABUFF:** owner-approved direct statistical source. Public statistics may be cited/used directly, but automated HTML scraping/private-endpoint reverse engineering still requires a provider-compatible access method or explicit permission.
- **Dota2ProTracker:** owner-approved direct professional/high-MMR source. Public statistics may be cited/used directly, but automated scraping remains disallowed under the currently reviewed site terms unless D2PT grants permission.
- **Valve / Steam:** conditional; API use and Valve artwork rights are separate, and the multiplayer unfair-advantage clause needs product-specific review.
- **Reddit/community:** qualitative only; community opinions never contribute directly to headline numerical statistics.

Owner approval recorded on 2026-09-19 establishes OpenDota, STRATZ, DOTABUFF, and Dota2ProTracker as the allowed direct-source set for DotaGraph. Direct-source approval does not override provider terms: use official APIs where available, do not bypass authentication/rate limits, and do not automate a website when its current terms prohibit that automation.

## Aggregation

The normal UI may show one aggregate win rate while details expose individual source observations.

Sample size is source-observation-local. Never sum provider sample counts merely because the labels/scopes appear compatible; overlapping populations are assumed possible unless non-overlap is proven under an approved aggregation method.

Preserve observations by source.

If scopes are incompatible, exclude or explicitly downgrade them. Never silently average incompatible populations.

Large cross-source disagreement must be visible in detailed data/flags.

## Counter detection/ranking

Raw win rate alone is insufficient to rank a specific counter.

Approved current methodology:
- user-visible statistic = raw source-hero matchup win rate;
- direct pair must have at least 500 qualifying current-patch matches;
- each hero baseline excludes the direct pair;
- expected matchup = `0.5 + (sourceBaseline - targetBaseline) / 2`;
- `delta = observed - expected`;
- sampling uncertainty includes pair and both baseline terms;
- internal `rankingScore = delta - 1.645 * standardError`;
- relationship is eligible only when `rankingScore > 0`;
- sort by rankingScore, then delta, sample size, stable IDs;
- never expose rankingScore as a fake percentage.

See `docs/METHODOLOGY.md` for the complete formula and units.

## Generated statistics are immutable by hand

Generated numeric datasets:
- clearly identified as generated;
- never manually edited;
- regenerated through the pipeline;
- optionally checked by CI for generation consistency.

Human contributors may edit explanations, sources, docs, and code.

Numeric corrections should fix source/pipeline/methodology and regenerate output.

## AI-authored content

AI may draft explanation prose.

AI is never a source.

Every explanation needs:
- actual source references;
- patch context;
- review state.

AI-generated prose must not overwrite calculated/statistical facts.

New AI drafts start pending_review and require human approval before being marked verified.

An agent must never self-approve its own generated explanation.

## Explanation quality

Short MatchupCard explanation: 2–4 sentences maximum.

Detailed explanation may include:
- concrete ability/mechanic interactions;
- lane/game-stage context;
- counterplay;
- limitations;
- source evidence;
- high-MMR/pro notes.

Avoid generic filler. If the reason is uncertain, state uncertainty and keep it pending rather than inventing confidence.

## Documentation

Keep these living documents as the project matures:
- PRODUCT.md
- DESIGN.md
- docs/ARCHITECTURE.md
- docs/DATA_MODEL.md
- docs/METHODOLOGY.md
- docs/SOURCES_AND_LICENSING.md
- docs/UX_STATES.md
- docs/ROADMAP.md
- ADRs for significant technical decisions.

Update documentation in the same PR when behavior or architecture changes.

## Open-source contributor experience

Repository must be understandable by an outside contributor.

Provide:
- clear README;
- setup commands;
- architecture orientation;
- data/source policy;
- CONTRIBUTING.md;
- issue templates;
- PR template;
- useful tests;
- good-first-issue opportunities.

Avoid requiring private local knowledge for small contributions.

## Git practices

Prefer small coherent changes.

Before editing:
- inspect surrounding code;
- understand existing conventions;
- check whether docs/tests must change too.

Do not mix unrelated refactors with feature work.
Do not rewrite history or force-push unless explicitly asked.
Never commit secrets.

## CI expectations

Production changes should eventually validate:
- lockfile/install integrity;
- formatting/lint;
- typecheck;
- unit tests;
- E2E smoke;
- build;
- data schema;
- generated file consistency;
- source/license registry where relevant;
- accessibility/design checks where practical.

Deploy GitHub Pages only after checks pass.

## Third-party assets

Track provenance.

Project MIT license does not automatically relicense:
- Valve/Dota artwork;
- hero portraits;
- item images;
- third-party icons;
- screenshots;
- datasets;
- vendored agent skills.

Keep NOTICE/attribution documentation current.

## Privacy and security

Do not add analytics, fingerprinting, advertising, login, cookies, or trackers as standard setup.

Any analytics/privacy-affecting feature requires explicit owner approval.

Security rules:
- API keys in environment/GitHub Secrets only;
- no secrets in client code;
- validate external JSON;
- lock dependencies;
- review dependency advisories;
- never execute untrusted community data as code;
- treat source URLs/content as untrusted input.

## Required relationship tests

Any change touching graph/domain logic needs tests proving:
- A -> B means A counters B;
- displayed win rate belongs to A;
- incoming/outgoing classification relative to selected hero;
- 0–5 cap;
- minimum-sample exclusion;
- deterministic sorting/tie handling;
- alias lookup;
- URL state validation.

## Current-patch freshness

Generated data must expose:
- patch;
- generated timestamp;
- source observation timestamp(s) where available.

If data is stale or patch mismatch is detected, the UI must not silently claim it is current.

Prefer a visible stale-data warning over false confidence.

## Future item/synergy rule

When Items and Synergies arrive, do not dump them into the same always-visible global graph.

Use explicit layers/modes such as:
- Counters
- Items
- Synergies

Only one relationship layer should dominate at a time.

## Human approval gates

Ask the owner before:
- adding a new external data source outside the owner-approved direct-source set;
- introducing a new automated scraping/access method that is not already documented as provider-compatible;
- changing headline rank scope;
- changing the 500-match threshold;
- changing aggregation methodology;
- publishing AI-drafted explanations as verified;
- adding analytics;
- adding auth/accounts;
- changing project license;
- adding a mandatory backend/runtime;
- replacing GitHub Pages;
- adding Items/Synergies to the current hero-counter scope;
- redesigning the product away from graph-first.

## When uncertain

Do not guess current Dota mechanics, patch details, API terms, source permissions, or library versions.

Research current primary/official sources, record decisions, and keep the implementation conservative when evidence remains unclear.

# Tooling, plugins, and skills

This section replaces the separate TOOLS_AND_SKILLS.md. Keep project-tooling guidance here so agents have one durable instruction file.

## Tool precedence

For design work:
1. owner-approved Figma;
2. DESIGN.md;
3. approved project screenshots/UX decisions;
4. project-specific instructions in this file;
5. generic skills.

Generic skills never override approved DotaGraph product decisions.

## Core connectors

### GitHub
Use for repository inspection, issues, PRs, CI, reviews, and maintenance.

### Figma
Use for the editable DotaGraph design system, screen states, component review, and design-to-code context.

Figma source:
https://www.figma.com/design/rydgq1wV8C0hlVb5n7Ohws/DotaGraph-Design?node-id=1-2&t=4TqWKwISZRk837Bf-0

### Vercel
Optional for temporary PR/design previews. Production target remains GitHub Pages.

### Sentry
Potentially useful later when the public product has meaningful runtime traffic. Do not add it before there is a real product need.

### Cloudflare
No current requirement. Revisit only if an actual CDN/serverless/edge feature requires it.

## Vendored skills

Portable project skills live under .agents/skills/.

Treat them as third-party vendored tooling. Keep original licenses and notices under .agents/skills/_licenses/ and .agents/skills/THIRD_PARTY_NOTICES.md.

Do not silently modify vendored skill text. If project-specific instructions are needed, create a separate local wrapper skill or update this AGENTS.md.

## JuliusBrussee/skills

Upstream:
https://github.com/JuliusBrussee/skills

Vendored skills:
- caveman
- context-canary
- deslopify
- grill-me
- interface-kit
- junior-to-senior
- last-20-percent
- loop-factory

Recommended use:

### interface-kit
Use for frontend implementation review, accessibility, typography, spatial rhythm, component states, and performance-conscious UI. Figma/DESIGN.md wins on conflicts.

### junior-to-senior
Use before major architecture/data decisions such as aggregation methodology, source adapters, graph technology changes, backend introduction, auth, or deployment changes.

### loop-factory
Use when task volume grows enough to justify a formal spec -> implementation -> review workflow.

### last-20-percent
Use before public milestones to inspect the actual user journey, empty states, first-run behavior, microcopy, and finish quality.

### context-canary
Use for long agent sessions to detect instruction/context drift and checkpoint rather than continuing with degraded context.

### grill-me
Use before difficult product/methodology decisions to challenge assumptions before code exists.

### deslopify
Use for README, release notes, contributor docs, Reddit/launch posts, and other public prose. Never alter factual values, statistics, URLs, or legal text.

### caveman
Optional for terse agent communication. Do not let it remove necessary technical detail.

## Humanizer

Upstream:
https://github.com/blader/humanizer

Vendored under .agents/skills/humanizer/.

Use for public-facing prose cleanup where a more natural voice is useful.

There is overlap with deslopify. Usually choose one cleanup pass rather than applying both blindly.

Never let Humanizer rewrite calculated values, sample sizes, patch numbers, source identifiers, URLs, quotes, or license text.

## Impeccable

Upstream:
https://github.com/CoeusInstitute/impeccable-ui-skill

Use Impeccable as design-quality tooling, especially to catch generic AI UI patterns.

For Codex, prefer the standalone detector where compatible:
npx impeccable detect src/

Do not assume Impeccable slash commands are available in Codex unless the installed/current version explicitly supports the current agent harness.

Impeccable is intentionally not fully vendored under .agents/skills because its current upstream distribution includes a large runtime/tooling bundle rather than a small portable Codex skill. Install/use it through its supported package/CLI workflow instead of copying a partial broken runtime.

Good workflow:
1. Figma/DESIGN.md sets intent.
2. Codex implements.
3. Run Impeccable detector.
4. Fix relevant findings.
5. Human visually reviews.
6. Use richer Impeccable workflows only in a supported harness.

## Browser/testing tools

Recommended:
- Playwright for E2E, keyboard flow, direct URL state, screenshots, and common viewport checks;
- Vitest for domain logic;
- Testing Library for components and accessibility-oriented behavior;
- axe or equivalent accessibility helper, backed by manual keyboard testing;
- Impeccable detector as design-quality lint, not absolute truth.

## Graph tooling

Leading candidate:
- Sigma.js for interactive WebGL graph rendering;
- Graphology for graph data structures/algorithms.

Keep D3 as an alternative/reference for custom geometry/layout work.

Before locking the renderer, document an ADR based on portrait nodes, active/dim state, tiny directed arrows, edge labels, deterministic layout, hit testing, zoom/pan, future scale, accessibility strategy, and maintainability.

## Data tooling

Future pipeline: Python + uv.

Do not use pip.

Select exact packages only when pipeline work begins and verify current maintenance/security first.

Source-tooling order:
1. official API;
2. documented public API;
3. licensed/open dataset;
4. manual qualitative reference;
5. HTML scraping only with explicit terms/permission compatibility.

## Deployment tooling

Production: GitHub Pages.

Optional: Vercel previews if the owner wants them.

Do not require Docker, Kubernetes, Cloudflare Workers, a database, or custom backend until a real feature demands them.

## Writing/tool safety

AI may draft documentation and explanations, but tools/skills must never silently change facts.

Protect:
- percentages;
- sample sizes;
- patch numbers;
- source URLs;
- provenance;
- methodology formulas;
- license text.

## Minimal recommended active skill set

For normal DotaGraph work:
1. GitHub connector
2. Figma connector
3. interface-kit
4. junior-to-senior for major decisions
5. last-20-percent before milestones
6. context-canary for long sessions
7. deslopify or humanizer for public prose
8. Impeccable detector for frontend review

Add loop-factory when task volume grows. Use grill-me when a difficult decision needs pressure-testing.
