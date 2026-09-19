from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Iterable


ONE_SIDED_95_Z = 1.645


@dataclass(frozen=True)
class PairObservation:
    first_slug: str
    second_slug: str
    matches: int
    first_wins: int


@dataclass(frozen=True)
class HeroTotals:
    wins: int
    games: int


@dataclass(frozen=True)
class RankedRelationship:
    source: str
    target: str
    source_win_rate: float
    sample_size: int
    source_baseline: float
    target_baseline: float
    expected_win_rate: float
    baseline_adjusted_delta: float
    standard_error: float
    ranking_score: float


def hero_totals(
    pairs: Iterable[PairObservation],
) -> dict[str, HeroTotals]:
    wins: dict[str, int] = {}
    games: dict[str, int] = {}

    for pair in pairs:
        wins[pair.first_slug] = wins.get(pair.first_slug, 0) + pair.first_wins
        games[pair.first_slug] = games.get(pair.first_slug, 0) + pair.matches

        second_wins = pair.matches - pair.first_wins
        wins[pair.second_slug] = wins.get(pair.second_slug, 0) + second_wins
        games[pair.second_slug] = games.get(pair.second_slug, 0) + pair.matches

    return {
        slug: HeroTotals(wins=wins[slug], games=games[slug])
        for slug in games
    }


def _baseline_excluding_pair(
    *,
    total: HeroTotals,
    pair_wins: int,
    pair_matches: int,
) -> tuple[float, int] | None:
    games = total.games - pair_matches
    wins = total.wins - pair_wins
    if games <= 0:
        return None
    return wins / games, games


def rank_pair(
    pair: PairObservation,
    totals: dict[str, HeroTotals],
    *,
    minimum_sample: int,
    confidence_z: float = ONE_SIDED_95_Z,
) -> RankedRelationship | None:
    if pair.matches < minimum_sample:
        return None
    if pair.matches <= 0 or not 0 <= pair.first_wins <= pair.matches:
        return None

    first_total = totals.get(pair.first_slug)
    second_total = totals.get(pair.second_slug)
    if first_total is None or second_total is None:
        return None

    first_baseline = _baseline_excluding_pair(
        total=first_total,
        pair_wins=pair.first_wins,
        pair_matches=pair.matches,
    )
    second_pair_wins = pair.matches - pair.first_wins
    second_baseline = _baseline_excluding_pair(
        total=second_total,
        pair_wins=second_pair_wins,
        pair_matches=pair.matches,
    )
    if first_baseline is None or second_baseline is None:
        return None

    first_baseline_rate, first_baseline_games = first_baseline
    second_baseline_rate, second_baseline_games = second_baseline

    first_rate = pair.first_wins / pair.matches
    expected_first = 0.5 + (first_baseline_rate - second_baseline_rate) / 2.0
    expected_first = max(0.0, min(1.0, expected_first))
    first_delta = first_rate - expected_first

    if first_delta >= 0:
        source = pair.first_slug
        target = pair.second_slug
        source_rate = first_rate
        source_baseline_rate = first_baseline_rate
        target_baseline_rate = second_baseline_rate
        source_baseline_games = first_baseline_games
        target_baseline_games = second_baseline_games
        expected = expected_first
        delta = first_delta
    else:
        source = pair.second_slug
        target = pair.first_slug
        source_rate = 1.0 - first_rate
        source_baseline_rate = second_baseline_rate
        target_baseline_rate = first_baseline_rate
        source_baseline_games = second_baseline_games
        target_baseline_games = first_baseline_games
        expected = 1.0 - expected_first
        delta = -first_delta

    variance = (
        source_rate * (1.0 - source_rate) / pair.matches
        + source_baseline_rate
        * (1.0 - source_baseline_rate)
        / (4.0 * source_baseline_games)
        + target_baseline_rate
        * (1.0 - target_baseline_rate)
        / (4.0 * target_baseline_games)
    )
    standard_error = math.sqrt(max(variance, 0.0))
    score = delta - confidence_z * standard_error

    if score <= 0:
        return None

    return RankedRelationship(
        source=source,
        target=target,
        source_win_rate=source_rate,
        sample_size=pair.matches,
        source_baseline=source_baseline_rate,
        target_baseline=target_baseline_rate,
        expected_win_rate=expected,
        baseline_adjusted_delta=delta,
        standard_error=standard_error,
        ranking_score=score,
    )


def rank_relationships(
    pairs: Iterable[PairObservation],
    *,
    minimum_sample: int,
    confidence_z: float = ONE_SIDED_95_Z,
) -> list[RankedRelationship]:
    pair_list = list(pairs)
    totals = hero_totals(pair_list)
    ranked = [
        relationship
        for pair in pair_list
        if (
            relationship := rank_pair(
                pair,
                totals,
                minimum_sample=minimum_sample,
                confidence_z=confidence_z,
            )
        )
        is not None
    ]
    ranked.sort(
        key=lambda item: (
            -item.ranking_score,
            -item.baseline_adjusted_delta,
            -item.sample_size,
            item.source,
            item.target,
        )
    )
    return ranked
