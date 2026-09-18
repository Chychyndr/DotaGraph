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

Focus centers the selected hero, strongly dims unrelated graph context, reveals 0–5 relationships per direction, adds tiny arrowheads, and shows win-rate labels.

Selecting or leaving a hero moves the camera with a short eased transition. Manual drag or wheel input immediately takes control and cancels that camera animation.

The graph canvas supports drag-to-pan and pointer-centered mouse-wheel zoom. A simple click on empty canvas clears the current hero selection; a drag never does.

Matchup keeps the graph visible, emphasizes one pair, and changes the compact card from HeroCard to MatchupCard.

## Win-rate placement

The percentage belongs to the source hero of the arrow.

Preferred experiment: put the pill roughly 20–35% along the edge from the source hero. Compare visually against at least one alternative before treating placement as final.

## Avoid

No generic SaaS gradients, glassmorphism, card soup, decorative blobs, giant headings, excessive glow, bounce animation, permanent drifting graph, or control-heavy sidebar.

## Motion

Camera transitions should feel direct and calm: roughly 400–500 ms with an ease-out curve.

Honor reduced motion. Do not run a continuous simulation after the graph settles.
