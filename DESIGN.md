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
- GitHub-like system font stack for familiar, neutral typography;
- solid panels with restrained borders and small radii;
- near-white primary text and muted gray secondary text;
- red incoming counter edges;
- blue outgoing counter edges;
- restrained amber selected-hero ring;
- Dota portrait art carries most of the color.

Approximate initial node sizes:
- default: 28 px;
- connected: 42 px;
- selected: 72 px.

## Interaction

Overview keeps the whole graph as a weak spiderweb.

Hover reveals only local context and never relayouts the graph.

Focus preserves the exact Overview graph layout. All heroes remain at their committed positions; unrelated heroes become subdued, while incoming and outgoing relationships and their endpoint heroes are emphasized in place. Focus must never construct or overlay a second arrangement of the same heroes. On desktop the Overview camera keeps the same scale and anchor when a hero is selected; the graph may translate slightly to make room for the HeroCard. Compact viewports may reframe the same graph only when needed to keep the selected hero usable with the context card.

Selecting or leaving a hero moves the camera with a short eased transition. Manual drag or wheel input immediately takes control and cancels that camera animation.

The graph canvas supports drag-to-pan and pointer-centered mouse-wheel zoom. A simple click on empty canvas clears the current hero selection; a drag never does.

Matchup keeps the graph visible, emphasizes one pair, and changes the compact card from HeroCard to MatchupCard.

## Win-rate placement

The percentage belongs to the source hero of the arrow.

The accepted current behavior is source-anchored, collision-aware placement on the active edge itself. Labels normally stay on the source half of the edge; when the selected hero is the source, the badge may sit farther down that half so dense outgoing fans remain readable. Hero names are placed outside their relationship paths and rendered on an opaque canvas backing so arrows and lines never visually cut through text. Percentage labels must avoid hero portraits and other active percentage labels while keeping relationship direction obvious.

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
