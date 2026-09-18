---
title: "Session Digest: manual:dotagraph-bootstrap"
type: session-digest
schema_version: 1
harness: "manual"
native_session_id: "dotagraph-bootstrap"
llm_wiki_session_id: "manual:dotagraph-bootstrap"
cwd: "{{CWD}}"
git_remote: "{{GIT_REMOTE}}"
git_branch: "{{GIT_BRANCH}}"
started_at: "{{NOW}}"
last_seen_at: "{{NOW}}"
tool_event_count: 0
event_count: 1
capture_trigger: "bootstrap"
topics: ["dotagraph"]
privacy: "redacted"
raw_transcripts: false
promoted_to: []
summary: "One-time bootstrap context distilled from the pre-llm-wiki DotaGraph chat and repository state on 2026-09-18."
---

# DotaGraph bootstrap context

This is a historical seed for the first llm-wiki-enabled Codex thread. Newer captured sessions should supersede it. Project code, tests, ADRs, issue #8, and current repository docs remain authoritative.

## Where the project was left

- DotaGraph is a graph-first Dota 2 hero counter project for fast draft decisions.
- Repository work through merged PR #15 was complete when this seed was written.
- The frontend already had the full 127-hero roster, deterministic SVG graph, one local WebP portrait atlas, collision-aware source-side win-rate labels, responsive behavior, keyboard accessibility, and verified GitHub Pages deployment.
- Sigma.js + Graphology had been tested in a real spike and deliberately rejected for the current product; SVG remained the accepted renderer.
- Production matchup ingestion had not started. Existing matchup percentages were development fixtures only.
- Permanent tracker issue #8 named the current task: explicit loading, stale-data, malformed-data, and portrait-failure states.

## Product decisions carried from the long chat

- `A -> B` always means A counters B; the displayed percentage belongs to A.
- Focus shows up to five reliable relationships per direction; zero is valid.
- Initial headline scope is Ancient+ and current-patch only; planning threshold is 500 matches until explicitly changed.
- No rank selector in the simple product. Immortal-only headline scope may be reconsidered later by explicit owner decision.
- Public UI is English for now; localization is later.
- Internal/debug labels should stay out of the normal interface, and the compact HeroCard should not repeat rank/patch scope text.
- AI may draft explanation/product text, but the owner is the approval gate and AI is never a factual source.
- Production data work must pass source/licensing, sample semantics, ranking, aggregation, and freshness decisions first.
- Python data tooling uses `uv`.
- The chosen site identity is the transparent graph/network logo already used as favicon/header logo.

## Resume behavior

Use this seed to avoid a cold start. For any volatile or implementation-specific fact, check the current code, issue #8, or the relevant living document instead of treating this historical digest as canonical.
