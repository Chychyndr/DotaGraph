# UX states

## Overview
- Full fixture graph visible.
- Weak relationship spiderweb.
- No win-rate labels.
- Search remains visible.
- Most hero names stay hidden until hover/focus.
- Layout is deterministic.

## Hover
- Hovered node grows slightly.
- Hero name appears.
- Local edges gain contrast.
- Unrelated graph dims.
- No large panel opens.
- No relayout.

## Focus
- Selected hero is comfortably centered.
- Gold ring.
- Up to five incoming relationships in coral.
- Up to five outgoing relationships in cyan.
- Tiny arrowheads clarify direction.
- Win-rate pills appear nearer the source hero.
- HeroCard appears.
- Clicking another background node refocuses.

## Matchup
- Selected relationship becomes dominant.
- Other active relationships dim.
- HeroCard becomes MatchupCard in the same region.
- Card shows A -> B, source win rate, sample, fixture explanation, and a future Details entry point.
- Graph remains visible.

## Reset
- Escape exits matchup first, then focus.
- Reset returns to Overview.
- Empty-canvas reset may be added if it does not conflict with pan/drag.

## Search
- Always visible.
- Keyboard arrows move through results.
- Enter selects.
- Escape closes/clears.
- Slash may focus the field.
- Aliases come from hero metadata.
