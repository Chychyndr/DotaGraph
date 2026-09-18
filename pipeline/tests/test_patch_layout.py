from __future__ import annotations

import unittest

from dotagraph_pipeline.generate_patch_layout import (
    MIN_SAMPLE,
    _build_affinities,
    _hero_baselines,
    _normalize_pairs,
    _select_layout_affinities,
)


class PatchLayoutTests(unittest.TestCase):
    def test_radiant_and_dire_rows_merge_into_one_pair(self) -> None:
        rows = [
            {
                "radiant_hero_id": 1,
                "dire_hero_id": 2,
                "matches": 600,
                "radiant_wins": 360,
            },
            {
                "radiant_hero_id": 2,
                "dire_hero_id": 1,
                "matches": 400,
                "radiant_wins": 180,
            },
        ]
        pairs = _normalize_pairs(rows, {1: "axe", 2: "viper"})
        observation = pairs[("axe", "viper")]

        self.assertEqual(observation.matches, 1000)
        self.assertEqual(observation.first_wins, 580)

    def test_sub_threshold_pair_is_excluded(self) -> None:
        rows = [
            {
                "radiant_hero_id": 1,
                "dire_hero_id": 2,
                "matches": MIN_SAMPLE - 1,
                "radiant_wins": 300,
            },
            {
                "radiant_hero_id": 1,
                "dire_hero_id": 3,
                "matches": 800,
                "radiant_wins": 440,
            },
            {
                "radiant_hero_id": 2,
                "dire_hero_id": 3,
                "matches": 800,
                "radiant_wins": 400,
            },
        ]
        pairs = _normalize_pairs(rows, {1: "axe", 2: "viper", 3: "huskar"})
        baselines = _hero_baselines(pairs)
        candidates = _build_affinities(pairs, baselines)

        self.assertFalse(
            any({edge.source, edge.target} == {"axe", "viper"} for edge in candidates)
        )

    def test_layout_selection_keeps_both_counter_directions_represented(self) -> None:
        rows = [
            {
                "radiant_hero_id": 1,
                "dire_hero_id": 2,
                "matches": 1200,
                "radiant_wins": 720,
            },
            {
                "radiant_hero_id": 1,
                "dire_hero_id": 3,
                "matches": 1200,
                "radiant_wins": 420,
            },
            {
                "radiant_hero_id": 2,
                "dire_hero_id": 3,
                "matches": 1200,
                "radiant_wins": 600,
            },
        ]
        pairs = _normalize_pairs(rows, {1: "axe", 2: "viper", 3: "huskar"})
        baselines = _hero_baselines(pairs)
        selected = _select_layout_affinities(_build_affinities(pairs, baselines))

        self.assertTrue(any(edge.source == "axe" for edge in selected))
        self.assertTrue(any(edge.target == "axe" for edge in selected))


if __name__ == "__main__":
    unittest.main()
