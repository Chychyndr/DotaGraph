# Data model

## Hero

A hero has:
- stable id;
- slug;
- display name;
- aliases;
- portrait URL;
- deterministic layout position;
- optional overall fixture win rate/sample used only for the current fixture-driven UI.

Aliases are data, not Search-component conditionals.

## MatchupRelationship

A relationship has:
- sourceHeroId;
- targetHeroId;
- sourceWinRate;
- sampleSize;
- patch;
- rankScope;
- sourceKind;
- optional fixture explanation.

Direction is explicit.

`A -> B` means A counters B. The displayed win rate belongs to A.

## Selection

For selected hero S:
- incoming: `targetHeroId === S`;
- outgoing: `sourceHeroId === S`.

Filter below the configured minimum sample before taking the top five per direction.

Ordering must be deterministic.

## Future production shape

Real observations will also need source/provenance metadata, timestamps, aggregation metadata, schema version, and stale-data handling.
