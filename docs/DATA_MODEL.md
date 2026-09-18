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

For production data, `sampleSize` is the known count of qualifying matches behind the source observation selected to support the published relationship. One qualifying match is one distinct completed match for the hero pair inside one exact source/patch/rank/match-population/observation-window scope.

A published relationship must not contain an estimated or semantically ambiguous sample count. Unknown-count observations cannot be promoted into the headline relationship set.

Direction is explicit.

`A -> B` means A counters B. The displayed win rate belongs to A.

## Patch-scoped layout snapshot

Hero geometry is generated separately from public relationship statistics.

A layout snapshot contains:
- schema version and patch;
- generation timestamp;
- exact source/query scope used to derive affinity;
- hero coverage and missing-source coverage;
- layout-quality metrics;
- one deterministic `x/y` position for every catalog hero.

Coordinates are keyed by stable internal hero slug so display-id aliases do not change topology.

The layout snapshot must not contain player-identifying data. For the 7.41e evaluation it also does not publish the raw OpenDota matchup matrix; only geometry and aggregate quality/provenance metadata are committed.

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

Real source observations will also need:
- provider/source identity;
- source query or endpoint provenance;
- patch;
- rank population and provider-specific rank predicate;
- match/game population filters;
- observation window;
- known source-local sample size;
- source observation timestamp(s);
- aggregation metadata where applicable;
- validated current-patch generation metadata.

Provider observations stay separate. Their `sampleSize` values are never summed unless a future approved aggregation method can prove the underlying match populations do not overlap.
