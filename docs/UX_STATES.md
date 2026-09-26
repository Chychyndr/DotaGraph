# UX states

## Overview

- All validated current-patch heroes are visible.
- A sparse deterministic relationship backbone gives graph structure without rendering the full production relationship corpus.
- The initial camera fits and centers the actual hero bounds instead of assuming the fixed canvas center.
- No win-rate labels.
- Search remains visible.
- Most hero names stay hidden until hover/focus.
- Layout is deterministic and generated offline from real current-patch matchup affinity.
- The stable hero field is uniformly expanded to use more of the available canvas, keeping portraits the same size while increasing space between nodes.
- Dragging empty graph space pans the viewport.
- The mouse wheel zooms around the pointer.

## Hover

- Hovered node grows slightly.
- Hero name appears in a dedicated top label layer so nearby portrait nodes cannot cover it.
- Local edges gain contrast while the sparse Overview backbone stays low-contrast.
- Hero coordinates and the rest of the Overview graph stay in place.
- No large panel opens.
- No relayout.

## Focus

- The Overview graph remains visible as low-contrast context.
- The selected hero and its active endpoints move into a deterministic presentation layout; unrelated heroes retain their committed Overview coordinates.
- Desktop places the selected hero near the center of the Focus stage, incoming endpoint heroes in a spacious left column, and outgoing endpoint heroes in a spacious right column.
- Compact Focus uses the same directional semantics with tighter columns and fixed labels above active portraits.
- Gold ring on the selected hero.
- Active Focus portraits are slightly larger than Overview portraits.
- Up to five incoming relationships in coral.
- Up to five outgoing relationships in cyan.
- Every active relationship is one straight SVG line between padded portrait boundaries. Focus never bends or collision-routes active relationships.
- Fixed portrait masks prevent relationship lines from painting through endpoint portrait art.
- Background heroes that would sit directly on a prominent Focus line or fixed win-rate pill may be fully suppressed for that Focus state; other unrelated heroes remain dimmed in place.
- Selected hero name is fixed above its portrait. Incoming hero names are fixed to the left and outgoing hero names to the right on desktop.
- The desktop HeroCard does not reposition active hero names.
- Each win-rate pill stays at 52% of its own relationship segment, centered on the line, with no leader/fan/external fallback.
- Win-rate pills must not overlap visible active hero portraits or hero-name labels.
- Straight active lines must not cross unrelated active portraits.
- The HeroCard section headings do not show “x/5” counters.
- HeroCard appears.
- Clicking another background node refocuses.
- Clicking empty graph space exits Focus.
- Dragging still pans without exiting Focus.

## Matchup

- Selected relationship becomes dominant.
- Other active relationships dim.
- HeroCard becomes MatchupCard in the same region.
- Card shows A -> B, raw source win rate, sample size, patch/rank scope, headline source, and baseline-adjusted matchup advantage; reviewed explanation appears only when available.
- A collapsed `Source details` disclosure exposes the real provider link, endpoint/query mode, observation window, and snapshot generation time without making the default card noisy.
- Approved secondary providers are never shown as matchup evidence until an actual source-local observation exists.
- When a real Immortal/pro observation exists for the same directed pair, a separate collapsed `Immortal / pro evidence` disclosure shows its population label, provider, source-local win rate/sample size, and observation window.
- The separate-population disclosure explicitly states that it is excluded from the Ancient+ headline and cross-source consensus.
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
- Aliases come from hero metadata and may include common abbreviations, established lore names, and legacy/community-recognized hero names.


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
- GitHub Actions targets a 12-hour refresh cadence, normally keeping the snapshot well inside the 36-hour stale threshold.

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

