from __future__ import annotations

import math
import unittest

from dotagraph_pipeline.ranking import (
    HeroTotals,
    PairObservation,
    hero_totals,
    rank_pair,
    rank_relationships,
)


def complete_pair_corpus(pair_matches: int, first_wins: int) -> list[PairObservation]:
    """Expand real 5v5 match groups so every outcome has five opponent rows."""
    groups = [
        (["axe", "a1", "a2", "a3", "a4"], ["viper", "b1", "b2", "b3", "b4"], pair_matches, first_wins),
        (["axe", "c1", "c2", "c3", "c4"], ["huskar", "d1", "d2", "d3", "d4"], 5000, 2500),
        (["viper", "e1", "e2", "e3", "e4"], ["huskar", "f1", "f2", "f3", "f4"], 5000, 2500),
    ]
    result = []
    for radiant, dire, matches, radiant_wins in groups:
        for source in radiant:
            for target in dire:
                first, second = sorted((source, target))
                wins = radiant_wins if first == source else matches - radiant_wins
                result.append(PairObservation(first, second, matches, wins))
    return result


class RankingTests(unittest.TestCase):
    def test_baseline_excludes_direct_pair(self) -> None:
        pairs = complete_pair_corpus(1000, 600)
        totals = hero_totals(pairs)

        relationship = rank_pair(
            pairs[0],
            totals,
            minimum_sample=500,
            confidence_z=0.0,
        )

        self.assertIsNotNone(relationship)
        assert relationship is not None
        self.assertEqual(relationship.source, "axe")
        self.assertEqual(relationship.target, "viper")
        self.assertAlmostEqual(relationship.source_baseline, 0.5)
        self.assertAlmostEqual(relationship.target_baseline, 0.5)
        self.assertAlmostEqual(relationship.expected_win_rate, 0.5)
        self.assertAlmostEqual(relationship.baseline_adjusted_delta, 0.1)
        self.assertEqual(totals["axe"].games, 5 * 6000)
        self.assertEqual(totals["axe"].wins, 5 * 3100)

    def test_below_minimum_sample_is_rejected(self) -> None:
        pairs = complete_pair_corpus(499, 350)
        relationship = rank_pair(
            pairs[0],
            hero_totals(pairs),
            minimum_sample=500,
        )
        self.assertIsNone(relationship)

    def test_direction_flips_when_second_hero_overperforms(self) -> None:
        pairs = complete_pair_corpus(1000, 400)
        relationship = rank_pair(
            pairs[0],
            hero_totals(pairs),
            minimum_sample=500,
            confidence_z=0.0,
        )
        self.assertIsNotNone(relationship)
        assert relationship is not None
        self.assertEqual(relationship.source, "viper")
        self.assertEqual(relationship.target, "axe")
        self.assertAlmostEqual(relationship.source_win_rate, 0.6)

    def test_confidence_penalty_can_reject_weak_edge(self) -> None:
        pairs = complete_pair_corpus(500, 267)
        relationship = rank_pair(
            pairs[0],
            hero_totals(pairs),
            minimum_sample=500,
        )
        self.assertIsNone(relationship)

    def test_strong_edge_survives_confidence_penalty(self) -> None:
        pairs = complete_pair_corpus(1000, 620)
        relationship = rank_pair(
            pairs[0],
            hero_totals(pairs),
            minimum_sample=500,
        )
        self.assertIsNotNone(relationship)
        assert relationship is not None
        self.assertGreater(relationship.ranking_score, 0)
        self.assertAlmostEqual(relationship.source_win_rate, 0.62)
        expected_se = math.sqrt(
            0.62 * 0.38 / 1000
            + 0.5 * 0.5 / (4 * 5000)
            + 0.5 * 0.5 / (4 * 5000)
        )
        self.assertAlmostEqual(relationship.standard_error, expected_se)

    def test_sorting_is_deterministic(self) -> None:
        pairs = complete_pair_corpus(1000, 620)
        first = rank_relationships(pairs, minimum_sample=500)
        second = rank_relationships(reversed(pairs), minimum_sample=500)
        self.assertEqual(first, second)

    def test_five_correlated_opponent_rows_do_not_shrink_baseline_uncertainty(self) -> None:
        pairs = complete_pair_corpus(1000, 620)
        totals = hero_totals(pairs)
        relationship = rank_pair(pairs[0], totals, minimum_sample=500)
        assert relationship is not None
        independent_variance = 0.62 * 0.38 / 1000 + 2 * 0.25 / (4 * 5000)
        duplicated_variance = 0.62 * 0.38 / 1000 + 2 * 0.25 / (4 * 25000)
        self.assertAlmostEqual(relationship.standard_error, math.sqrt(independent_variance))
        self.assertGreater(relationship.standard_error, math.sqrt(duplicated_variance))

    def test_incomplete_5v5_corpus_is_rejected(self) -> None:
        pairs = complete_pair_corpus(1000, 620)
        pairs.remove(next(pair for pair in pairs if pair.first_slug == "a1" and pair.second_slug == "viper"))
        with self.assertRaisesRegex(ValueError, "Direct-pair counts exceed"):
            rank_relationships(pairs, minimum_sample=500)

    def test_non_integral_hero_match_totals_are_rejected(self) -> None:
        pair = PairObservation("axe", "viper", 1000, 620)
        for total in (HeroTotals(wins=15620, games=30001), HeroTotals(wins=15621, games=30000)):
            with self.subTest(total=total):
                with self.assertRaisesRegex(ValueError, "complete 5v5"):
                    rank_pair(pair, {"axe": total, "viper": HeroTotals(wins=14400, games=30000)}, minimum_sample=500)

    def test_pair_without_independent_baseline_is_rejected(self) -> None:
        pair = PairObservation("axe", "viper", 1000, 620)
        totals = {"axe": HeroTotals(wins=3100, games=5000), "viper": HeroTotals(wins=1900, games=5000)}
        self.assertIsNone(rank_pair(pair, totals, minimum_sample=500))


if __name__ == "__main__":
    unittest.main()
