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

- dark tinted canvas;
- graph-first composition;
- quiet panels;
- near-white primary text;
- muted secondary text;
- coral/red incoming counter edges;
- cyan/blue outgoing counter edges;
- restrained gold selected-hero ring;
- Manrope direction;
- Dota portrait art carries most of the color.

Approximate initial node sizes:
- default: 28 px;
- connected: 42 px;
- selected: 72 px.

## Interaction

Overview keeps the whole graph as a weak spiderweb.

Hover reveals only local context and never relayouts the graph.

Focus centers the selected hero, strongly dims unrelated graph context, reveals 0–5 relationships per direction, adds tiny arrowheads, and shows win-rate labels.

Matchup keeps the graph visible, emphasizes one pair, and changes the compact card from HeroCard to MatchupCard.

## Win-rate placement

The percentage belongs to the source hero of the arrow.

Preferred experiment: put the pill roughly 20–35% along the edge from the source hero. Compare visually against at least one alternative before treating placement as final.

## Avoid

No generic SaaS gradient hero, glassmorphism, card soup, decorative blobs, giant headings, excessive glow, bounce animation, permanent drifting graph, or control-heavy sidebar.

## Motion

Use short camera/opacity/scale transitions. Honor reduced motion. Do not run a continuous simulation after the graph settles.
