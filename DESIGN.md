# Design

## Source of truth

1. Owner-approved Figma.
2. This document.
3. Approved UX screenshots/decisions.
4. AGENTS.md.
5. Generic UI skills.

Figma:
https://www.figma.com/design/rydgq1wV8C0hlVb5n7Ohws/DotaGraph-Design?node-id=1-2&t=4TqWKwISZRk837Bf-0

## Visual language

- plain dark canvas with no decorative glow or gradient;
- graph-first composition;
- Mona Sans as the primary interface typeface, with the existing system sans-serif stack as fallback;
- solid panels with restrained borders and small radii;
- near-white primary text and muted gray secondary text;
- red incoming counter edges;
- blue outgoing counter edges;
- restrained amber selected-hero ring;
- Dota portrait art carries most of the color.

Approximate portrait sizes:
- default Overview/background: 28 px;
- active Focus relationship: about 34 px;
- selected Focus hero: about 34 px with a stronger gold ring;
- hover may grow to about 36 px.

The stable Overview hero field should use the graph canvas generously. Keep that topology recognizable, but Focus may move only the selected hero and its active relationship endpoints into a deterministic presentation layout. This gives the relationship star enough breathing room without changing the underlying relationship data.

## Interaction

Overview keeps the whole graph as a weak spiderweb.

Hover reveals only local context and never relayouts the graph.

Focus keeps the Overview graph as subdued background context, while the selected hero and its active endpoints move into a deterministic spacious relationship-star layout. Incoming endpoints occupy the left side, outgoing endpoints occupy the right side, and the selected hero stays near the center of the Focus stage. Every active relationship is one straight line; Focus must not use bent or collision-routed active polylines. Background heroes stay at their committed Overview positions and may be fully hidden only when they would visually sit directly on an active Focus lane or fixed win-rate pill.

Selecting or leaving a hero moves the camera with a short eased transition. Manual drag or wheel input immediately takes control and cancels that camera animation.

The graph canvas supports drag-to-pan and pointer-centered mouse-wheel zoom. A simple click on empty canvas clears the current hero selection; a drag never does.

Matchup keeps the graph visible, emphasizes one pair, and changes the compact card from HeroCard to MatchupCard.

## Win-rate placement

The percentage belongs to the source hero of the arrow.

In Focus, every win-rate pill has a fixed position at 52% of its own straight padded relationship segment. The pill stays centered on that line, never fans away from it, never gains a leader line, and never moves onto an external continuation. Hero names also use fixed Focus anchors: selected name above the portrait, incoming names to the left, outgoing names to the right on desktop; compact Focus uses fixed above-portrait labels.

## Product chrome decisions

- Use the transparent network/shield DotaGraph mark as both favicon and header logo.
- Keep internal/debug labels such as “Fixture data”, “Hero counters”, and direction-debug copy out of the normal product UI.
- Keep HeroCard compact but comfortably readable; do not repeat the global rank/patch line inside the selected-hero card.
- Do not show “x/5” counters beside the Countered by / Counters section headings.

## Avoid

No generic SaaS gradients, glassmorphism, card soup, decorative blobs, giant headings, excessive glow, bounce animation, permanent drifting graph, or control-heavy sidebar.

## Motion

Camera transitions should feel direct and calm: roughly 400–500 ms with an ease-out curve.

Honor reduced motion. Do not run a continuous simulation after the graph settles.
