# UX states

## Overview

- Full validated current-patch hero graph visible.
- Weak relationship spiderweb.
- No win-rate labels.
- Search remains visible.
- Most hero names stay hidden until hover/focus.
- Layout is deterministic.
- Dragging empty graph space pans the viewport.
- The mouse wheel zooms around the pointer.

## Hover

- Hovered node grows slightly.
- Hero name appears in a dedicated top label layer so nearby portrait nodes cannot cover it.
- Local edges gain contrast.
- Unrelated graph dims.
- No large panel opens.
- No relayout.

## Focus

- Selected hero remains the camera anchor and stays centered on desktop.
- Focus scale adapts to the active relationship spread: close matchups keep the normal scale, while distant counters trigger only as much zoom-out as needed to fit the active set with padding.
- Compact focus keeps its upward offset for the context card and uses the cropped visible graph span when calculating scale.
- Gold ring.
- Up to five incoming relationships in coral.
- Up to five outgoing relationships in cyan.
- Hero names render above portrait nodes.
- Tiny arrowheads clarify direction.
- Win-rate pills appear nearer the source hero.
- HeroCard appears.
- Clicking another background node refocuses.
- Clicking empty graph space exits Focus.
- Dragging still pans without exiting Focus.

## Matchup

- Selected relationship becomes dominant.
- Other active relationships dim.
- HeroCard becomes MatchupCard in the same region.
- Card shows A -> B, raw source win rate, sample size, patch/rank scope, source provenance, and baseline-adjusted matchup advantage; reviewed explanation appears only when available.
- Graph remains visible.

## Reset

- Escape exits matchup first, then focus.
- Reset returns to Overview.
- A simple click on empty graph space clears the selected hero and matchup.

## Search

- Always visible.
- Keyboard arrows move through results.
- Enter selects.
- Escape closes/clears.
- Slash may focus the field.
- Aliases come from hero metadata.


## Responsive behavior

- The app uses the dynamic viewport height so mobile browser chrome does not create hidden overflow.
- At compact widths, the graph fills the available stage instead of shrinking the complete 1200×760 canvas into an unreadable thumbnail.
- Focused heroes are shifted above the context card on compact screens.
- Search results and context cards scroll internally and stay inside the viewport.
- Safe-area insets are respected at the top and bottom.
- The layout is browser-tested at 320×568, 390×844, 768×1024, and the supported desktop sizes.

## Keyboard and assistive technology

- The graph is exposed as an interactive group with all hero nodes available as buttons.
- Only one hero is in the normal Tab order at a time.
- Arrow keys move spatially between nearby heroes; compact navigation keeps the focused hero in view.
- Enter or Space activates the focused hero.
- Visible focus styling is drawn on the hero ring.
- Hero search uses combobox/listbox semantics and exposes the `/` keyboard shortcut.
- Search selection moves keyboard focus to the selected graph hero.
- Focus and matchup changes are announced through a polite live region.
- Relationship controls describe direction and identify whose win rate is being shown.
- Reduced-motion preferences bypass the camera animation.

## Runtime data and asset states

### Loading

- The brand remains visible while the published matchup bundle is loading and being validated.
- The graph and search are withheld until validation succeeds.
- A polite live status explains that matchup data is being checked.

### Stale data

- A validated bundle older than 36 hours is marked `stale` by the production snapshot adapter and remains usable.
- A compact warning stays above the graph and includes the calculated age reason.
- Daily GitHub Actions generation normally refreshes the snapshot well before the 36-hour threshold.

### Malformed data

- The graph is blocked when the published bundle fails validation.
- Partial relationships are never rendered.
- The error state explains that validation failed, exposes the first validation reason, and provides Retry.

### Dataset unavailable

- A failed local bundle load shows a blocking retry state.
- The UI does not silently fall back to fabricated or incomplete data.

### Portrait failure

- The shared portrait atlas is requested and decoded once.
- If the atlas fails, the graph remains interactive and all portrait slots keep their normal dimensions.
- Graph nodes and cards switch to compact text fallbacks derived from hero names.
- A non-blocking warning explains that portraits are unavailable.

