from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
import logging
from pathlib import Path
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

from dotagraph_pipeline.generate_current_bundle import (
    _ensure_layout_neighbors,
    _normalize_immortal_pairs,
    _normalize_pairs,
    _pair_query,
    _request_json,
    _retry_after_seconds,
    _select_layout_relationships,
    generate,
)
from dotagraph_pipeline.logging_utils import configure_logging
from dotagraph_pipeline.ranking import RankedRelationship


class CurrentBundleTests(unittest.TestCase):
    def test_retry_after_seconds_reads_provider_hint(self) -> None:
        self.assertEqual(
            _retry_after_seconds(
                '{"retry_after": 60}',
                {"Retry-After": "120"},
            ),
            120.0,
        )

    def test_request_json_waits_for_provider_retry_hint(self) -> None:
        url = "https://api.opendota.com/api/explorer"
        error = HTTPError(
            url,
            522,
            "Connection timed out",
            {},
            BytesIO(b'{"retry_after": 120}'),
        )
        response = MagicMock()
        response.__enter__.return_value = response
        response.__exit__.return_value = False
        response.status = 200
        response.read.return_value = b'{"ok": true}'

        with (
            patch(
                "dotagraph_pipeline.generate_current_bundle.urlopen",
                side_effect=[error, response],
            ),
            patch(
                "dotagraph_pipeline.generate_current_bundle.time.sleep"
            ) as sleep,
        ):
            payload = _request_json(
                url,
                logger=logging.getLogger("test.opendota.retry"),
                attempts=2,
            )

        self.assertEqual(payload, {"ok": True})
        sleep.assert_called_once_with(120.0)

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

    def test_pair_query_collects_immortal_subset_without_second_request(self) -> None:
        query = _pair_query(1, 2)

        self.assertIn("avg_rank_tier >= 60", query)
        self.assertIn("avg_rank_tier >= 80", query)
        self.assertIn("immortal_matches", query)
        self.assertIn("immortal_radiant_wins", query)

    def test_normalize_immortal_pairs_merges_radiant_and_dire(self) -> None:
        rows = [
            {
                "radiant_hero_id": 1,
                "dire_hero_id": 2,
                "matches": 600,
                "radiant_wins": 360,
                "immortal_matches": 120,
                "immortal_radiant_wins": 78,
            },
            {
                "radiant_hero_id": 2,
                "dire_hero_id": 1,
                "matches": 400,
                "radiant_wins": 180,
                "immortal_matches": 80,
                "immortal_radiant_wins": 28,
            },
        ]

        pairs = _normalize_immortal_pairs(rows, {1: "axe", 2: "viper"})

        self.assertEqual(len(pairs), 1)
        self.assertEqual(pairs[0].matches, 200)
        self.assertEqual(pairs[0].first_wins, 130)

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
        self.assertGreaterEqual(len(chen_neighbors), 2)

    def test_committed_snapshot_layout_quality(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]
        payload = __import__("json").loads(
            (repo_root / "public" / "data" / "current-matchups.json").read_text(
                encoding="utf-8"
            )
        )
        metrics = payload["layoutMetrics"]

        self.assertEqual(metrics["coveredNodeCount"], 127)
        self.assertEqual(metrics["isolatedNodeCount"], 0)
        self.assertGreaterEqual(metrics["minimumNodeDistance"], 84.0)
        self.assertGreaterEqual(metrics["medianNearestNodeDistance"], 84.0)
        self.assertLessEqual(metrics["maxNearestNodeDistance"], 135.0)

    def test_generate_emits_741f_production_contract(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]
        now = datetime(2026, 9, 19, 8, 0, tzinfo=timezone.utc)
        rows = [
            {
                "radiant_hero_id": 2,
                "dire_hero_id": 47,
                "matches": 1000,
                "radiant_wins": 620,
                "immortal_matches": 240,
                "immortal_radiant_wins": 156,
            },
            {
                "radiant_hero_id": 2,
                "dire_hero_id": 59,
                "matches": 5000,
                "radiant_wins": 2500,
                "immortal_matches": 900,
                "immortal_radiant_wins": 450,
            },
            {
                "radiant_hero_id": 47,
                "dire_hero_id": 59,
                "matches": 5000,
                "radiant_wins": 2500,
                "immortal_matches": 850,
                "immortal_radiant_wins": 425,
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

        evidence = next(
            item
            for item in payload["evidenceObservations"]
            if item["sourceSlug"] == "axe" and item["targetSlug"] == "viper"
        )
        self.assertEqual(evidence["provider"], "OpenDota")
        self.assertEqual(evidence["scope"]["rankScope"], "immortal")
        self.assertEqual(evidence["sampleSize"], 240)
        self.assertAlmostEqual(evidence["sourceWinRate"], 0.65)
        self.assertIn("avg_rank_tier>=80", evidence["provenance"]["queryScope"])
        self.assertEqual(
            payload["coverage"]["immortalEvidenceCount"],
            len(payload["evidenceObservations"]),
        )


if __name__ == "__main__":
    unittest.main()
