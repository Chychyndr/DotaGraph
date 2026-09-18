# Accepted decisions

This file records durable decisions and why they exist. Newer decisions supersede older ones explicitly.

## D-001 — Relationship direction

Status: accepted.

`A -> B` means A counters B everywhere: data, graph, cards, URL-derived state, tests, and docs.

Reason: direction must be mechanically unambiguous.

## D-002 — Displayed statistic ownership

Status: accepted.

The visible percentage belongs to the source hero. Place the label nearer the source side of the edge.

Reason: users should understand whose win rate is shown without extra explanatory UI.

Implemented with deterministic collision-aware label placement in PR #12.

## D-003 — Rank scope

Status: accepted for current product.

Headline scope is Ancient+. No rank selector.

Immortal/pro evidence may appear later as separate detailed evidence. The owner is open to reconsidering an eventual Immortal-only headline scope, but this requires an explicit decision.

## D-004 — Current patch only

Status: accepted.

The public product represents the current patch only. Planning patch at project kickoff was 7.41e, but patch identity belongs in data/configuration.

No historical patch archive is currently required.

## D-005 — Minimum sample

Status: planning default, approval gate remains.

Candidate threshold is 500 matches in the relevant scope.

Treat it as configurable methodology and do not hardcode it through the UI.

## D-006 — Counter ranking needs baseline correction

Status: research direction, formula not approved.

Raw matchup win rate alone is not enough to identify a specific counter because general hero strength affects the expected result.

A future method may use actual-vs-expected matchup performance, sample confidence, freshness, source quality, and cross-source agreement.

Do not invent or expose an arbitrary counter score before methodology approval.

## D-007 — Renderer

Status: accepted in ADR 0001 and PR #13.

Keep the deterministic SVG renderer.

Sigma.js + Graphology handled the 127-node graph easily, but added about 48.74 kB gzip and complicated source-owned edge labels, portrait-atlas reuse, DOM accessibility, and deterministic testing.

Revisit if the graph reaches materially larger node/edge counts or profiling shows SVG is a real bottleneck.

## D-008 — Portrait delivery

Status: accepted in PR #11.

Use one same-origin generated WebP atlas for all 127 hero portraits at runtime.

Build tooling may obtain lawful upstream portraits and pack them, but production rights/provenance still require explicit review.

## D-009 — Static deployment

Status: accepted.

Production target is GitHub Pages with Vite.

Pages source must be GitHub Actions. Deployment verifies the exact built commit SHA in a fresh Chromium browser.

Use query parameters for graph state so refresh works on static hosting.

## D-010 — Source automation gate

Status: accepted.

Do not begin production source automation before terms/licensing/methodology review.

- Dota2ProTracker: no scraping/ingestion under current decision.
- DOTABUFF: no automated scraping until current permission/terms clearly allow it.
- OpenDota: preferred open-ecosystem candidate; hosted API/data terms require separate review.
- STRATZ: preferred API candidate; verify terms, quotas, redistribution, and token handling.
- Valve/Steam: follow API terms; secrets never ship to frontend.
- Reddit/community: qualitative evidence only, never headline numeric data.

## D-011 — Generated statistics

Status: accepted.

Generated numeric datasets are immutable by hand. Correct the source/pipeline/methodology and regenerate.

Production observations retain direction, source win rate, sample, patch, rank scope, provenance, and collection/generation metadata.

## D-012 — AI-authored explanations

Status: accepted.

AI may draft explanation prose but is never a source.

Drafts require real references, patch context, and human approval. An agent must not self-approve its own explanation.

## D-013 — Product language

Status: owner decision preserved from chat.

English only for now. Localization is intentionally later because it creates ongoing maintenance cost.

## D-014 — Visual simplification

Status: accepted through PRs #2–#3.

Normal UI should avoid internal/debug clutter. Current visual direction uses a flat dark canvas, GitHub-like system typography, restrained panels, and color mainly for graph semantics.

Earlier Manrope direction is superseded by the current implemented system font decision.

## D-015 — Project labels

Status: accepted through PR #9.

Avoid product/release status labels such as V1/V2/alpha/beta/prototype version in DotaGraph docs/issues/roadmap. Use current/next/later/planned wording.

Dependency/API/schema/runtime version numbers are still fine when technically needed.

## D-016 — Future complexity uses layers

Status: accepted.

Items, synergies, and other future relationship types must be explicit layers/modes. Only one relationship layer should dominate at a time.

Do not over-generalize the current code for hypothetical future node types.

## D-017 — No passive tracking by default

Status: accepted.

Do not add analytics, fingerprinting, ads, login, cookies, or trackers as standard setup. Privacy-affecting changes require owner approval.

## D-018 — Python tooling

Status: accepted.

Future production pipeline uses Python + uv. Never use pip.
