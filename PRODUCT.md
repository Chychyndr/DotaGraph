# Product

## Mission

DotaGraph is a current-patch Dota 2 matchup knowledge graph built for quick decisions during a draft or match.

The primary user should be able to understand a selected hero's strongest reliable counter relationships in seconds, then open deeper evidence only when needed.

## Primary questions

1. Who reliably counters this hero?
2. Whom does this hero reliably counter?
3. What is the source hero's matchup win rate?
4. What evidence explains the relationship?

## V1

V1 includes heroes, directed counter relationships, search, graph overview, focus, matchup state, win rate, sample size, and a compact contextual card.

V1 excludes items, synergies, facets/aspects, rank filters, patch history, live draft automation, accounts, voting, analytics dashboards, and settings-heavy UI.

## Statistical scope

Initial headline scope: Ancient+.

Planning patch at kickoff: 7.41e. Patch must remain configuration/data, never a structural hardcode.

The focused graph shows up to five reliable incoming and up to five reliable outgoing relationships. Zero is valid.

## Product constraint

`A -> B` always means A counters B.

The graph is the primary surface. Search is always obvious. Details are progressive.
