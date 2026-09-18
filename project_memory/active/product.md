# Product and UX memory

## Mission and audience

DotaGraph is an open-source, graph-first Dota 2 matchup knowledge project for ordinary ranked players who need fast counter information during a draft or game.

Primary questions:
- Who counters this hero?
- Whom does this hero counter?
- What is the source hero's matchup win rate?
- What evidence explains that relationship?

Advanced users/contributors should be able to inspect methodology and provenance without making the default interface heavy.

## Current scope

Current product:
- heroes;
- directed hero-vs-hero counter relationships;
- full graph overview;
- hover/focus/matchup states;
- hero search and aliases;
- HeroCard / MatchupCard;
- source win rate and sample size;
- static-host-safe URL state.

Explicitly outside current scope:
- items;
- synergies;
- positions/roles as UI filters;
- rank selector;
- historical patch browser;
- accounts/auth;
- analytics/trackers;
- settings-heavy UI;
- live draft automation;
- mandatory backend.

Later layers may include Item -> Hero counters, Hero synergies, counter-counter responses, multi-hero draft analysis, and localization. They should appear as explicit modes/layers rather than one unreadable mega-graph.

## Owner decisions preserved from chat

- Public product language: English only for now.
- Localization can come later.
- AI may draft explanatory/product text; owner remains the approval gate.
- Ancient+ is the initial headline rank scope.
- Immortal-only may be reconsidered later if evidence supports it, but a rank selector is still unwanted in the simple product.
- Internal/debug labels such as “Fixture data”, “Hero counters”, and a visible counter-direction legend should not clutter the normal UI.
- The compact selected HeroCard should not repeat “Ancient+ · Patch …”.
- Chosen identity: transparent graph/network logo with blue/white/red nodes and a red directional arrow, used as favicon and header logo.
- Product/release documentation should avoid labels such as V1/V2/alpha/beta; use current/next/later/planned scope language.

## Relationship semantics

`A -> B` always means A counters B.

The normal edge percentage belongs to the source hero:
- `A -> B · 55.4%` means A has a 55.4% matchup win rate against B in the stated scope.

Direction must never be encoded through color alone.

## Statistical scope

- Initial headline rank scope: Ancient+.
- Planning patch at kickoff: 7.41e.
- Patch is configuration/data metadata, never a structural hardcode.
- Public product represents the current patch only.
- No public historical-patch archive unless the owner changes that decision.
- Planned candidate threshold: at least 500 matches in the relevant scope.
- Focus may show 0–5 reliable incoming and 0–5 reliable outgoing relationships.
- Never add weak relationships merely to fill five slots.

## Ranking and aggregation

Raw win rate is the displayed statistic but is insufficient by itself to define a meaningful counter.

Future ranking may consider:
- each hero's baseline strength;
- expected matchup win rate;
- actual-vs-expected delta;
- sample size/confidence;
- cross-source agreement;
- source quality;
- rank-scope compatibility;
- freshness.

Do not expose an arbitrary “counter score” as objective probability.

Keep source observations separate. Never sum sample counts across overlapping providers. Do not silently average incompatible populations.

## UX states

### Overview
- all current heroes;
- weak spiderweb;
- low-contrast edges;
- stable deterministic layout;
- obvious search;
- minimal labels.

### Hover
- local context only;
- no relayout;
- no large panel.

### Focus
- selected hero prominent;
- unrelated graph strongly dimmed;
- up to 5 incoming and 5 outgoing relationships;
- tiny arrowheads;
- source-side percentage labels;
- compact HeroCard.

### Matchup
- selected pair emphasized;
- HeroCard becomes MatchupCard;
- graph remains visible.

### Navigation
- drag empty graph to pan;
- pointer-centered mouse wheel zoom;
- a click on empty graph leaves selection;
- a drag never accidentally clears selection;
- Escape exits matchup first, then focus;
- search supports aliases, keyboard arrows, Enter, and slash shortcut metadata.

## Visual language

Current implemented direction supersedes earlier typography experiments:
- flat dark canvas;
- GitHub-like system font stack;
- quiet solid surfaces;
- restrained borders/radii;
- coral/red incoming;
- cyan/blue outgoing;
- restrained amber/gold selected state;
- Dota portraits carry most color.

Avoid generic AI/SaaS decoration:
- marketing gradients;
- glassmorphism;
- card soup;
- decorative glow/blobs;
- giant app headings;
- bounce or breathing animation.

## Accessibility

- all graph heroes have an accessible button path;
- one roving Tab stop;
- spatial Arrow-key navigation;
- Enter/Space activation;
- visible focus;
- search combobox/listbox semantics;
- selected/search focus handoff;
- live announcements for Focus/Matchup;
- textual relationship equivalents;
- reduced-motion support;
- no color-only semantics.

## Design precedence

1. owner-approved Figma;
2. `DESIGN.md`;
3. approved screenshots/UX decisions;
4. `AGENTS.md`;
5. generic skills and this memory.
