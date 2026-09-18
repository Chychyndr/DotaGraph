# Data model

## Hero

A hero has:
- stable id;
- slug;
- display name;
- aliases;
- sprite index in the shared local portrait atlas;
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

## Published dataset bundle

The frontend loads one bundle containing:
- heroes;
- relationships;
- scope;
- metadata.

Metadata currently contains:
- `schemaVersion`;
- `generatedAt`;
- an upstream freshness status: `current` or `stale`;
- a required human-readable reason when the bundle is marked stale.

The frontend validates the complete bundle before exposing it to the graph. Unknown hero references, duplicate ids, invalid win rates/sample sizes, unsupported scope values, malformed timestamps, and scope mismatches make the bundle unusable rather than partially rendering it.

The UI does not derive a final time-based staleness threshold yet. That policy remains a separate methodology decision; the current frontend only renders the freshness state supplied by validated metadata.

## Selection

For selected hero S:
- incoming: `targetHeroId === S`;
- outgoing: `sourceHeroId === S`.

Filter below the configured minimum sample before taking the top five per direction.

Ordering must be deterministic.

## Future production shape

Real observations will also need source/provenance metadata, source observation timestamps, aggregation metadata, and validated current-patch generation output.
