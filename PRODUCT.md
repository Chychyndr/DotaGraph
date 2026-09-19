# Product

## Mission

DotaGraph is a current-patch Dota 2 matchup knowledge graph built for quick decisions during a draft or match.

The primary user should be able to understand a selected hero's strongest reliable counter relationships in seconds, then open deeper evidence only when needed.

## Primary questions

1. Who reliably counters this hero?
2. Whom does this hero reliably counter?
3. What is the source hero's matchup win rate?
4. What evidence explains the relationship?

## Current product scope

The current product scope includes heroes, directed counter relationships, search, graph overview, focus, matchup state, win rate, sample size, and a compact contextual card.

The current product scope excludes items, synergies, facets/aspects, rank filters, patch history, live draft automation, accounts, voting, analytics dashboards, and settings-heavy UI.

The public product is English-only for the current scope. Localization may be added later when its maintenance cost is justified.

## Statistical scope

Initial headline scope: Ancient+.

A rank selector is intentionally excluded from the current product. The owner may later change the headline scope, including a possible move to Immortal-only, but such a change requires an explicit product/methodology decision.

Planning patch at kickoff: 7.41e. Patch must remain configuration/data, never a structural hardcode.

Selecting a hero highlights up to five reliable incoming and up to five reliable outgoing relationships on the same graph. Zero is valid.

## Product constraint

`A -> B` always means A counters B.

The graph is the primary surface. Search is always obvious. Details are progressive.

## Content approval

AI may draft explanatory product/matchup text, but the owner remains the approval gate. AI-generated prose is never evidence and must not self-approve as verified content.
