from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import unittest
from unittest.mock import patch

from dotagraph_pipeline.generate_current_bundle import (
    _ensure_layout_neighbors,
    _normalize_pairs,
    _select_layout_relationships,
    generate,
)
from dotagraph_pipeline.logging_utils import configure_logging
from dotagraph_pipeline.ranking import RankedRelationship


class CurrentBundleTests(unittest.TestCase):
    def test_normalize_pairs_merges_radiant_and_dire(self) -> None:
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
        self.assertEqual(len(pairs), 1)
        self.assertEqual(pairs[0].matches, 1000)
        self.assertEqual(pairs[0].first_wins, 580)

    def test_layout_selection_covers_every_hero_with_affinity_evidence(self) -> None:
        def relationship(source: str, target: str, delta: float) -> RankedRelationship:
            return RankedRelationship(
                source=source,
                target=target,
                source_win_rate=0.55,
                sample_size=1000,
                source_baseline=0.5,
                target_baseline=0.5,
                expected_win_rate=0.5,
                baseline_adjusted_delta=delta,
                standard_error=0.01,
                ranking_score=delta,
            )

        ranked = [
            relationship("chen", "axe", 0.08),
            relationship("chen", "viper", 0.06),
            relationship("naga_siren", "viper", 0.07),
            relationship("naga_siren", "huskar", 0.05),
            relationship("axe", "huskar", 0.04),
        ]

        selected = _select_layout_relationships(ranked, neighbors_per_hero=1)
        covered = {
            hero
            for item in selected
            for hero in (item.source, item.target)
        }

        self.assertEqual(
            covered,
            {"chen", "axe", "viper", "naga_siren", "huskar"},
        )
        self.assertLessEqual(len(selected), len(covered))

    def test_layout_fallback_anchors_rare_hero(self) -> None:
        def relationship(source: str, target: str, delta: float) -> RankedRelationship:
            return RankedRelationship(
                source=source,
                target=target,
                source_win_rate=0.55,
                sample_size=180,
                source_baseline=0.5,
                target_baseline=0.5,
                expected_win_rate=0.5,
                baseline_adjusted_delta=delta,
                standard_error=0.02,
                ranking_score=delta,
            )

        primary = [
            relationship("axe", "viper", 0.08),
            relationship("viper", "huskar", 0.07),
        ]
        fallback = [
            relationship("chen", "axe", 0.06),
            relationship("chen", "viper", 0.05),
            relationship("chen", "huskar", 0.04),
        ]

        selected = _ensure_layout_neighbors(
            primary,
            fallback,
            {"chen", "axe", "viper", "huskar"},
            minimum_neighbors=2,
        )

        chen_neighbors = [
            item
            for item in selected
            if item.source == "chen" or item.target == "chen"
        ]
        self.assertEqual(len(chen_neighbors), 2)

    def test_generate_emits_741f_production_contract(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]
        now = datetime(2026, 9, 19, 8, 0, tzinfo=timezone.utc)
        rows = [
            {
                "radiant_hero_id": 2,
                "dire_hero_id": 47,
                "matches": 1000,
                "radiant_wins": 620,
            },
            {
                "radiant_hero_id": 2,
                "dire_hero_id": 59,
                "matches": 5000,
                "radiant_wins": 2500,
            },
            {
                "radiant_hero_id": 47,
                "dire_hero_id": 59,
                "matches": 5000,
                "radiant_wins": 2500,
            },
        ]

        with patch(
            "dotagraph_pipeline.generate_current_bundle._fetch_pair_rows",
            return_value=rows,
        ):
            payload = generate(
                repo_root,
                now=now,
                logger=configure_logging(),
            )

        self.assertEqual(payload["schemaVersion"], 2)
        self.assertEqual(payload["kind"], "current-production-matchups")
        self.assertEqual(payload["patch"], "7.41f")
        self.assertEqual(
            payload["scope"]["observationWindowStart"],
            "2026-09-16T00:00:00Z",
        )
        self.assertEqual(payload["scope"]["minimumSample"], 500)
        self.assertEqual(payload["provenance"]["headlineSource"], "OpenDota")
        self.assertEqual(payload["coverage"]["catalogHeroCount"], 127)
        self.assertEqual(len(payload["positions"]), 127)

        relationships = payload["relationships"]
        relationship = next(
            item
            for item in relationships
            if item["sourceSlug"] == "axe" and item["targetSlug"] == "viper"
        )
        self.assertAlmostEqual(relationship["sourceWinRate"], 0.62)
        self.assertGreater(relationship["rankingScore"], 0)
        self.assertIn("baselineAdjustedDelta", relationship)
        self.assertIn("standardError", relationship)


if __name__ == "__main__":
    unittest.main()
