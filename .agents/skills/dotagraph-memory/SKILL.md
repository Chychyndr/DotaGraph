---
name: dotagraph-memory
description: Maintain and restore durable DotaGraph project context from project_memory/. Use when resuming DotaGraph in a new session, after substantial product/architecture/data decisions, before a handoff, when context drift is suspected, or when asked to preserve project context.
---

# DotaGraph Memory

Use this skill to keep DotaGraph continuity outside a single chat.

## Start of a DotaGraph session

Read in this order:

1. `AGENTS.md`
2. `project_memory/index.md`
3. `project_memory/handoff.md`
4. only the relevant files under `project_memory/active/`
5. current code/living docs for any fact you are about to change

If work depends on project status, inspect the permanent GitHub tracker (#8) and open PRs before acting.

Do not load the entire memory tree when a narrower file is enough.

## Source-of-truth rule

Project memory is a cache of durable context, not the highest authority.

When memory conflicts with:
- current code/tests;
- accepted ADRs;
- living docs;
- owner-approved Figma;
- a newer explicit owner decision;

use the stronger/newer source and update memory in the same change.

## What to record

Record:
- owner constraints that affect future work;
- accepted product/technical decisions;
- rationale and evidence for important tradeoffs;
- current implementation state;
- current task, blockers, and next gates;
- meaningful bugs/root causes;
- validation evidence that matters for future decisions.

Do not record:
- raw chat dumps;
- transient brainstorming;
- secrets;
- speculative facts stated as decisions;
- large generated data that belongs elsewhere.

## End of a substantial task

Update as needed:

- `project_memory/handoff.md` — latest resume point;
- `project_memory/active/status.md` — implementation/test/deployment facts;
- `project_memory/active/decisions.md` — only when a durable decision changed or was added;
- `project_memory/active/product.md` — only when product/owner constraints changed;
- `project_memory/knowledge-graph.md` — when major relationships/dependencies changed.

Keep the handoff concise. Link to detailed sources instead of duplicating everything.

## Decision hygiene

For every durable decision, capture:
- status;
- decision;
- why;
- evidence/PR/ADR when available;
- whether it supersedes an earlier decision.

Never silently rewrite a superseded decision.

## Volatile facts

Treat these as volatile and re-check before relying on them:
- current patch;
- package/library versions;
- open PRs;
- CI state;
- data-provider terms;
- public API quotas;
- current tracker task;
- live deployment health.

## DotaGraph-specific invariants

Preserve unless the owner explicitly changes them:
- `A -> B = A counters B`;
- displayed percentage belongs to source hero;
- current product is graph-first;
- 0–5 reliable relationships per direction;
- Ancient+ headline scope;
- current-patch-only public data;
- planned 500-match threshold;
- no rank selector in the simple product;
- no production ingestion before legal/methodology approval;
- no fake relationships to fill UI;
- Python pipeline uses uv;
- AI explanations require real sources and human approval;
- no analytics/auth/backend by default;
- future relationship types use explicit layers/modes.

## Context drift

The repository already contains the `context-canary` skill for long sessions.

When drift is suspected:
1. stop relying on conversational memory;
2. re-read this skill, `AGENTS.md`, and `project_memory/handoff.md`;
3. verify the current code/tracker;
4. refresh the handoff before continuing a long chain of work.
