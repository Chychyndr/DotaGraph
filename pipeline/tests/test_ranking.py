from __future__ import annotations

import math
import unittest

from dotagraph_pipeline.ranking import (
    PairObservation,
    hero_totals,
    rank_pair,
    rank_relationships,
)


class RankingTests(unittest.TestCase):
    def test_baseline_excludes_direct_pair(self) -> None:
        pairs = [
            PairObservation("axe", "viper", 1000, 600),
            PairObservation("axe", "huskar", 2000, 1000),
            PairObservation("viper", "huskar", 2000, 1000),
        ]
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

    def test_below_minimum_sample_is_rejected(self) -> None:
        pairs = [
            PairObservation("axe", "viper", 499, 350),
            PairObservation("axe", "huskar", 1000, 500),
            PairObservation("viper", "huskar", 1000, 500),
        ]
        relationship = rank_pair(
            pairs[0],
            hero_totals(pairs),
            minimum_sample=500,
        )
        self.assertIsNone(relationship)

    def test_direction_flips_when_second_hero_overperforms(self) -> None:
        pairs = [
            PairObservation("axe", "viper", 1000, 400),
            PairObservation("axe", "huskar", 2000, 1000),
            PairObservation("viper", "huskar", 2000, 1000),
        ]
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
        pairs = [
            PairObservation("axe", "viper", 500, 270),
            PairObservation("axe", "huskar", 5000, 2500),
            PairObservation("viper", "huskar", 5000, 2500),
        ]
        relationship = rank_pair(
            pairs[0],
            hero_totals(pairs),
            minimum_sample=500,
        )
        self.assertIsNone(relationship)

    def test_strong_edge_survives_confidence_penalty(self) -> None:
        pairs = [
            PairObservation("axe", "viper", 1000, 620),
            PairObservation("axe", "huskar", 5000, 2500),
            PairObservation("viper", "huskar", 5000, 2500),
        ]
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
        pairs = [
            PairObservation("axe", "viper", 1000, 620),
            PairObservation("bane", "viper", 1000, 620),
            PairObservation("axe", "huskar", 5000, 2500),
            PairObservation("bane", "huskar", 5000, 2500),
            PairObservation("viper", "huskar", 5000, 2500),
        ]
        first = rank_relationships(pairs, minimum_sample=500)
        second = rank_relationships(reversed(pairs), minimum_sample=500)
        self.assertEqual(first, second)


if __name__ == "__main__":
    unittest.main()
