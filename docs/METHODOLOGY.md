# Methodology

Status: production methodology is not approved yet.

## Current fixture methodology

All matchup percentages used for current interface work are development fixtures.

They exist only to test direction, density, labels, cards, and selection behavior.

Do not cite or publish fixture values as real Dota statistics.

## Canonical sample-size semantics

Status: **approved**.

### Canonical unit

One sample is one distinct completed Dota 2 match in which:
- both heroes in the observation were picked;
- the heroes were on opposing teams;
- the match has a definitive result;
- the match satisfies one exact statistical scope;
- the match is counted at most once inside that source observation.

For a source observation of hero A versus hero B, `sampleSize` is the number of qualifying A-vs-B matches used to calculate that observation's matchup win rate.

Sample size belongs to the underlying matchup observation, not to arrow direction. If the same source/scope/window can express both A -> B and B -> A, both directions are based on the same set of qualifying matches.

### Exact scope requirement

Every production sample count must belong to one explicit observation scope containing at least:
- source/provider;
- patch;
- rank population;
- game/match population used by the provider;
- collection/observation window;
- the hero pair.

Do not combine matches across patches to reach the threshold.

Do not combine incompatible rank populations, game modes, provider filters, or observation windows into one sample count.

The approved headline rank scope remains Ancient+. Each future source adapter must document the exact predicate it uses to map provider data to Ancient+ before that source can produce headline observations.

### Deduplication

When raw match IDs are available, deduplicate within an observation by provider + match ID before counting.

A match appearing through multiple endpoints from the same provider still counts once.

When a provider exposes only an aggregate matchup count, DotaGraph may preserve that source-native count only if the provider clearly documents what the count represents and the adapter records the exact query/scope. It must not be presented as globally deduplicated.

### Multiple providers

Provider sample counts remain separate.

Never add sample counts from different providers merely because their hero pair, patch, and rank labels look compatible. Their underlying match populations may overlap.

Examples:
- OpenDota 300 + STRATZ 250 is **not** 550.
- Provider A 2,400 + Provider B 1,900 remains two observations: 2,400 and 1,900.
- A future aggregation method may use both observations as evidence, but it must not report 4,300 samples unless non-overlap is actually proven and the aggregation methodology explicitly allows it.

If a future published win rate is calculated from multiple provider observations, the generated schema must represent those observations and aggregate metadata explicitly. It must not attach a fabricated summed `sampleSize` to the aggregate rate.

### Reliability threshold

The approved normal-candidate minimum is **500 qualifying matches per source observation**.

A source observation with `sampleSize >= 500` passes the sample-size gate. Passing this gate does not by itself prove that the relationship is a counter; ranking methodology is a separate decision.

A source observation below 500 cannot qualify a relationship for the normal headline candidate set.

Counts from separate providers cannot be combined to cross the 500 threshold.

The threshold is methodology/configuration and must not be duplicated as an unexplained magic number throughout the codebase.

Changing the 500-match threshold requires an explicit owner/methodology decision.

### Missing or ambiguous counts

A production headline relationship must never use an unknown, estimated, inferred, or semantically ambiguous sample count as if it were exact.

If a provider does not expose a trustworthy count for the exact observation scope:
- retain the source only as non-headline evidence if later methodology allows it;
- do not invent `0`, `1`, or an estimated value;
- do not promote the observation into the generated headline relationship set.

The published `MatchupRelationship.sampleSize` therefore always represents a known qualifying count for the observation chosen to support that published relationship.

### Valid-match filtering

Source adapters must document provider-specific exclusions such as abandoned, invalid, no-result, duplicate, or unsupported-mode matches.

If the provider cannot establish a definitive winner, required hero identities, or the approved patch/rank scope, that match must not contribute to a headline sample count.

### Worked examples

**Example 1 — eligible observation**

Provider A reports 1,284 distinct Ancient+ matches of Viper versus Huskar on the current patch under one documented query scope.

`sampleSize = 1284`. The observation passes the 500-match sample gate.

**Example 2 — below threshold**

Provider A reports 312 qualifying Axe-versus-Viper matches.

`sampleSize = 312`. The observation remains valid evidence but cannot enter the normal headline counter candidate set.

**Example 3 — cross-provider overlap**

Provider A reports 320 qualifying matches and Provider B reports 290.

DotaGraph stores two source observations. Neither passes the 500-match gate. The project must not claim `sampleSize = 610`.

**Example 4 — patch mixing**

A provider reports 420 matches on patch X and 260 on patch Y.

These are separate observations. DotaGraph must not combine them into 680 matches for the current-patch relationship.

**Example 5 — aggregate-only provider**

A provider returns `games_played = 4,812` for the exact hero pair/query scope but does not expose match IDs.

DotaGraph may preserve `4,812` as that provider's source-native sample count only after the adapter documents the endpoint semantics. It cannot use that number to deduplicate against another provider.

## Displayed statistic

The graph displays source-hero matchup win rate.

`A -> B` at 55.4% means A has 55.4% win rate against B in the stated scope.

## Future ranking

Raw matchup win rate alone is not enough to rank specific counters because hero baseline strength changes the expected result.

Research direction:
- baseline strength of both heroes;
- expected matchup win rate;
- actual-vs-expected delta;
- sample-size confidence;
- cross-source agreement;
- freshness;
- rank-scope compatibility.

No user-visible confidence/counter score should be invented before the formula is justified.

## Aggregation

Future source observations must remain separate.

Never sum overlapping provider sample sizes.

A primary aggregate may be shown only after a documented method and source-compatibility rules are approved.
