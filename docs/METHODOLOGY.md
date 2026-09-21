# Methodology

Status: current-patch sample-size, counter-ranking, and cross-source detail aggregation/disagreement methodology are approved.

## Current production snapshot

The published graph uses generated current-patch matchup observations rather than development fixtures.

Current production scope:
- patch 7.41f;
- OpenDota `public_matches` as the headline source;
- ranked All Draft only (`game_mode = 22`, `lobby_type = 7`);
- OpenDota average rank tier >= 60 as the Ancient+ adapter predicate;
- observation window starts at the recorded 7.41f patch boundary and ends at generation time;
- generation targets a 12-hour cadence in GitHub Actions.

Development fixtures may still exist in tests, but they must never be substituted for the published production bundle.

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

## Data-driven graph layout

Graph geometry is derived from real current-patch matchup evidence, but layout eligibility is deliberately separate from headline-counter publication.

Primary layout affinity:
- source corpus and scope are the same current 7.41f OpenDota ranked Ancient+ observations used by the production pipeline;
- a pair needs at least 500 observed matches;
- layout ranking uses the baseline-adjusted matchup delta without the one-sided 95% headline confidence penalty (`confidence_z = 0`);
- up to five strongest incident affinity relationships are retained per hero;
- the resulting relationships affect coordinates only.

Rare-hero geometry fallback:
- if a hero would otherwise have fewer than two layout neighbors, geometry may use current-patch observations down to the explicit 100-match fallback floor;
- fallback edges are never published as headline counters;
- fallback observations do not alter displayed win rates, headline ranking, or the normal 500-match eligibility rule;
- low-degree heroes are pulled toward the centroid of their real affinity neighbors before collision relaxation so sparse evidence does not create detached layout islands.

Final coordinates are deterministic. Collision relaxation enforces a 58 px default center distance. A final sparse-gap compaction pass moves only visually detached hull nodes toward their current nearest node until the nearest-node gap is at most 88 px; this pass does not change relationship semantics or the 58 px collision floor. Generated snapshots record node-spacing, nearest-neighbor, isolation, and edge-distance metrics. CI rejects the committed production snapshot if any hero is isolated, minimum spacing falls below the tested threshold, or the worst nearest-neighbor gap exceeds the 90 px quality gate.

The layout affinity is not a user-visible counter score. Its output is stable geometry and layout-quality metadata only.

## Counter ranking

Status: **approved for implementation/evaluation on patch 7.41f**.

The percentage shown to users remains the raw source-hero matchup win rate. Ranking uses a separate internal conservative score so globally strong heroes do not automatically dominate the counter list.

For ordered matchup `A -> B`:

```text
p = wins(A vs B) / matches(A vs B)

baselineA = A win rate against all other heroes
baselineB = B win rate against all other heroes

expected = 0.5 + (baselineA - baselineB) / 2
delta = p - expected

se = sqrt(
  p * (1 - p) / nPair
  + baselineA * (1 - baselineA) / (4 * nBaselineA)
  + baselineB * (1 - baselineB) / (4 * nBaselineB)
)

rankingScore = delta - 1.645 * se
```

The direct A-vs-B observation is excluded from both hero baselines.

Eligibility:
- exact current patch/scope;
- known sample count;
- `nPair >= 500`;
- `rankingScore > 0`.

Sort order:
1. `rankingScore` descending;
2. `delta` descending;
3. `sampleSize` descending;
4. stable hero IDs.

Show at most five relationships per direction. Never fill missing slots with weak or previous-patch relationships.

`rankingScore` is internal and is not presented as a user-facing percentage or invented “counter score”.

## Cross-source detail aggregation

Status: **approved for secondary-source detail views**.

The graph headline remains the current OpenDota observation. Cross-source aggregation is a detail-view aid only: it must never silently replace the headline rate, alter graph ranking, or change the source-local sample count attached to the published relationship.

### Compatibility gate

An observation may enter the detail consensus only when all of these are true:

1. it describes the same directed hero pair;
2. it is from the same Dota patch;
3. it maps to the same normalized rank scope;
4. it maps to the same normalized match population;
5. both observation windows are valid, overlap by at least **50% of the shorter window**, and their end times differ by no more than **36 hours**;
6. the source-local sample size is known and is at least **500** qualifying matches;
7. the source win rate is a valid finite value from 0 to 1.

Adapters must normalize provider-specific predicates into explicit scope metadata. A provider label that merely sounds similar, such as "high skill" versus Ancient+, is not enough to declare compatibility.

Observations that fail this gate remain available as separate evidence with explicit exclusion reasons. They are not discarded. In particular, Immortal/professional evidence belongs in its own population section instead of being mixed into the Ancient+ consensus.

### Provider deduplication

One provider receives at most one vote in a consensus for one exact detail scope.

If multiple compatible observations from the same provider are present, use the newest collected observation and mark older ones as superseded. Multiple endpoints, snapshots, or pages from one provider must not give that provider extra weight.

### Consensus statistic

A consensus requires at least **two compatible providers**.

The consensus win rate is the **equal-provider median** of the compatible source win rates. Provider sample counts are deliberately not used as aggregation weights because provider populations may overlap and are not statistically independent.

The consensus has **no aggregate sample size**. Never sum provider sample sizes, and never attach a fabricated total count to the median.

This median is a descriptive detail statistic only. It is not a confidence estimate, a replacement ranking score, or a new headline probability.

### Disagreement levels

Measure disagreement as the range between the highest and lowest compatible provider win rates, in percentage points:

- **aligned:** spread < 2 pp;
- **noticeable:** spread >= 2 pp and < 5 pp;
- **large:** spread >= 5 pp;
- **single_source:** fewer than two compatible providers.

For aligned and noticeable evidence, the detail view may show the median consensus together with the individual source rows.

For large disagreement, **suppress the consensus win rate** and show the individual source observations plus a visible disagreement warning. A single summary number would hide materially conflicting evidence.

These thresholds classify disagreement in the displayed raw matchup win rates only. They must not be interpreted as proof that provider-specific counter-ranking methods agree or disagree unless those methods are separately comparable.

### Non-aggregated evidence

A source observation may still be useful in details even when it cannot enter the consensus, for example:

- sample size below 500;
- unknown sample size;
- different rank population;
- professional-only population;
- different match population;
- different patch;
- stale or poorly overlapping observation window.

Such evidence must retain its own source, scope, sample semantics, observation timestamp, and reason for exclusion from the consensus.

Cross-source sample sizes remain source-local in every case.
