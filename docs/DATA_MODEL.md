# Data model

## Hero

A hero has:
- stable UI id;
- stable internal Dota/OpenDota slug;
- display name;
- aliases;
- sprite index in the shared local portrait atlas;
- deterministic current-patch layout position;
- optional generated overall win rate;
- optional generated current-scope match count.

Aliases are data, not Search-component conditionals.

The generated hero match count is exact for the current 5v5 OpenDota query: each hero-match contributes five opponent-pair observations, so the pipeline validates divisibility by five before publishing it.

## MatchupRelationship

A published relationship has:
- sourceHeroId;
- targetHeroId;
- raw sourceWinRate;
- sampleSize;
- patch;
- rankScope;
- sourceKind;
- internal rankingScore;
- baselineAdjustedDelta;
- expectedWinRate;
- standardError;
- provenanceSource;
- observation window;
- optional reviewed explanation.

Direction is explicit.

`A -> B` means A counters B. The percentage shown on the edge belongs to A and is the raw observed A-vs-B win rate.

`rankingScore` selects/orders reliable relationships but is never presented as a percentage.

For production data, `sampleSize` is the known count of qualifying matches behind that exact source observation. One qualifying sample is one distinct completed match for the hero pair inside one source/patch/rank/match-population/observation-window scope.

A published relationship must not contain an estimated or semantically ambiguous sample count. Counts from separate providers are never silently summed.

## Generated current snapshot

GitHub Actions writes one generated static file:

`public/data/current-matchups.json`

Schema v2 contains:
- current patch;
- generation timestamp;
- exact rank/mode/observation scope;
- headline source provenance;
- coverage diagnostics;
- layout quality metrics;
- generated hero statistics;
- every confidence-qualified directed relationship;
- deterministic `x/y` position for every catalog hero.

Coordinates and source observations are keyed by stable internal hero slug. The frontend converts those slugs to stable UI ids after loading.

The snapshot contains aggregate matchup data only. It does not contain player identities or raw match IDs.

## Frontend DatasetBundle

The frontend converts the generated snapshot into one validated bundle containing:
- heroes;
- relationships;
- scope;
- metadata.

Metadata schema v2 contains:
- `schemaVersion`;
- `generatedAt`;
- headline `source`;
- structured `provenance` with the headline provider plus optional source URL, endpoint, query mode, and approved secondary-source registry entries;
- `observationWindowStart`;
- `observationWindowEndExclusive`;
- freshness state.

The frontend may expose the headline provenance in matchup details. `secondarySources` is registry metadata only: a provider listed there is not presented as matchup evidence until a real `MatchupEvidenceObservation` exists for that provider.

A snapshot is treated as stale after 36 hours without regeneration. Stale data remains usable with a visible warning; malformed data blocks the graph.

Runtime validation rejects:
- unknown/duplicate hero references;
- invalid coordinates;
- invalid raw win rates;
- sample counts below the published threshold;
- non-positive generated ranking scores/deltas;
- malformed provenance;
- patch/rank scope mismatches;
- malformed timestamps.

## Selection

For selected hero S:
- incoming: `targetHeroId === S`;
- outgoing: `sourceHeroId === S`.

Filter by current patch/rank/sample requirements before taking the top five per direction.

Deterministic ordering:
1. rankingScore descending;
2. baselineAdjustedDelta descending;
3. sampleSize descending;
4. stable hero ids.

Missing reliable relationships stay missing. Never fill slots with weak, previous-patch, or fabricated relationships.

## Multi-source detail model

OpenDota currently supplies the reproducible headline numeric observation.

Secondary detail evidence uses `MatchupEvidenceObservation`. Each observation preserves:
- stable observation id;
- provider/source identity;
- explicit directed hero pair;
- raw source-hero matchup win rate;
- source-local sample size when known;
- patch;
- normalized rank scope;
- normalized match-population key;
- observation-window start/end;
- source URL;
- provider query/scope description;
- collection timestamp.

Compatibility is explicit. An observation excluded from consensus remains attached to the detail evidence with one or more machine-readable reasons such as:
- different direction;
- different patch;
- different rank scope;
- different match population;
- invalid/misaligned observation window;
- invalid win rate;
- unknown/insufficient sample size;
- superseded same-provider observation.

`CrossSourceEvidenceSummary` contains:
- the reference/headline observation id;
- compatible included observations;
- excluded observations with reasons;
- disagreement level;
- provider spread in percentage points when at least two providers qualify;
- optional consensus win rate.

The consensus is an equal-provider median and exists only with at least two compatible providers and less than 5 pp spread. It deliberately has no aggregate `sampleSize`. Provider counts are never summed merely because scopes appear compatible.

Immortal/professional observations remain valid separate evidence but cannot enter the Ancient+ consensus unless a future methodology explicitly changes the normalized scope rules.
