from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import unittest
from unittest.mock import patch

from dotagraph_pipeline.generate_current_bundle import (
    _normalize_pairs,
    generate,
)
from dotagraph_pipeline.logging_utils import configure_logging


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
