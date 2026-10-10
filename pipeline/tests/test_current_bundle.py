from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
import logging
import os
from pathlib import Path
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

from dotagraph_pipeline.generate_current_bundle import (
    _ensure_layout_neighbors,
    _fetch_range,
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


def complete_match_rows(*, immortal_evidence: bool = True) -> list[dict]:
    """Three complete 5v5 groups with independent outcomes for both baselines."""
    match_groups = [
        ([2, 3, 4, 5, 6], [47, 7, 8, 9, 10], 1000, 620, 240, 156),
        ([2, 11, 12, 13, 14], [59, 15, 16, 17, 18], 5000, 2500, 900, 450),
        ([47, 19, 20, 21, 22], [59, 23, 25, 26, 27], 5000, 2500, 850, 425),
    ]
    return [
        {
            "radiant_hero_id": radiant_hero,
            "dire_hero_id": dire_hero,
            "matches": matches,
            "radiant_wins": wins,
            "immortal_matches": immortal_matches if immortal_evidence else 0,
            "immortal_radiant_wins": immortal_wins if immortal_evidence else 0,
        }
        for radiant, dire, matches, wins, immortal_matches, immortal_wins in match_groups
        for radiant_hero in radiant
        for dire_hero in dire
    ]


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
                "matches": "400",
                "radiant_wins": "180",
            },
        ]
        pairs = _normalize_pairs(rows, {1: "axe", 2: "viper"})
        self.assertEqual(len(pairs), 1)
        self.assertEqual(pairs[0].matches, 1000)
        self.assertEqual(pairs[0].first_wins, 580)

    def test_normalize_pairs_rejects_unknown_and_repeated_heroes(self) -> None:
        for radiant_id, dire_id in ((999, 2), (1, 999), (1, 1)):
            with self.subTest(pair=(radiant_id, dire_id)):
                row = {
                    "radiant_hero_id": radiant_id,
                    "dire_hero_id": dire_id,
                    "matches": 600,
                    "radiant_wins": 360,
                }
                with self.assertRaisesRegex(RuntimeError, "unknown or repeated hero"):
                    _normalize_pairs([row], {1: "axe", 2: "viper"})

    def test_normalize_pairs_rejects_invalid_aggregate_counts(self) -> None:
        for matches, wins in ((-1, 0), (100, -1), (100, 101), (100.5, 50), (100, 50.5), (True, 1), (100, False), (None, 0)):
            with self.subTest(matches=matches, wins=wins):
                row = {
                    "radiant_hero_id": 1,
                    "dire_hero_id": 2,
                    "matches": matches,
                    "radiant_wins": wins,
                }
                with self.assertRaises((RuntimeError, ValueError, TypeError)):
                    _normalize_pairs([row], {1: "axe", 2: "viper"})

    def test_fetch_range_rejects_non_object_aggregate_rows(self) -> None:
        for invalid_row in (None, "row", [], 123):
            with self.subTest(row=invalid_row):
                with patch(
                    "dotagraph_pipeline.generate_current_bundle._request_json",
                    return_value={"rows": [invalid_row]},
                ):
                    with self.assertRaisesRegex(RuntimeError, "malformed aggregate row"):
                        _fetch_range(1, 2, logger=logging.getLogger("test.invalid.rows"))

    def test_pair_query_collects_immortal_subset_without_second_request(self) -> None:
        query = _pair_query(1, 2)

        self.assertIn("avg_rank_tier >= 60", query)
        self.assertIn("avg_rank_tier >= 80", query)
        self.assertNotIn("avg_rank_tier >= 75", query)
        self.assertIn("radiant_win IS NOT NULL", query)
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
                "immortal_matches": "80",
                "immortal_radiant_wins": "28",
            },
        ]

        pairs = _normalize_immortal_pairs(rows, {1: "axe", 2: "viper"})

        self.assertEqual(len(pairs), 1)
        self.assertEqual(pairs[0].matches, 200)
        self.assertEqual(pairs[0].first_wins, 130)

    def test_normalize_immortal_pairs_rejects_invalid_subset_counts(self) -> None:
        for matches, wins in ((-1, 0), (10, -1), (10, 11), (0, 1), (10.5, 5), (10, False), (601, 360), (600, 361), (600, 359)):
            with self.subTest(matches=matches, wins=wins):
                row = {
                    "radiant_hero_id": 1,
                    "dire_hero_id": 2,
                    "matches": 600,
                    "radiant_wins": 360,
                    "immortal_matches": matches,
                    "immortal_radiant_wins": wins,
                }
                with self.assertRaises((RuntimeError, ValueError, TypeError)):
                    _normalize_immortal_pairs([row], {1: "axe", 2: "viper"})

    def test_generate_preserves_unavailable_immortal_evidence_without_fabrication(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]
        with patch(
            "dotagraph_pipeline.generate_current_bundle._fetch_pair_rows",
            return_value=complete_match_rows(immortal_evidence=False),
        ):
            payload = generate(
                repo_root,
                now=datetime(2026, 9, 19, 8, 0, tzinfo=timezone.utc),
                logger=configure_logging(),
            )
        self.assertGreater(len(payload["relationships"]), 0)
        self.assertEqual(payload["evidenceObservations"], [])
        self.assertEqual(payload["coverage"]["immortalEvidenceCount"], 0)
        self.assertEqual(payload["coverage"]["immortalEvidenceStatus"], "unavailable")
        self.assertIn("does not distinguish Immortal from Divine 5", payload["coverage"]["immortalEvidenceReason"])

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

    def test_layout_selection_matches_focus_incoming_and_outgoing_limits(self) -> None:
        def relationship(
            source: str,
            target: str,
            score: float,
        ) -> RankedRelationship:
            return RankedRelationship(
                source=source,
                target=target,
                source_win_rate=0.55,
                sample_size=1000,
                source_baseline=0.5,
                target_baseline=0.5,
                expected_win_rate=0.5,
                baseline_adjusted_delta=score,
                standard_error=0.01,
                ranking_score=score,
            )

        ranked = [
            relationship("center", "a", 0.90),
            relationship("center", "b", 0.80),
            relationship("x", "center", 0.70),
            relationship("y", "center", 0.60),
            # Keep the lower center relationships from being rescued by their
            # opposite endpoint when the per-direction limit is one.
            relationship("c", "b", 0.95),
            relationship("y", "d", 0.95),
            relationship("x", "e", 0.95),
        ]

        selected = _select_layout_relationships(ranked, neighbors_per_hero=1)
        pairs = {(item.source, item.target) for item in selected}

        self.assertIn(("center", "a"), pairs)
        self.assertIn(("x", "center"), pairs)
        self.assertNotIn(("center", "b"), pairs)
        self.assertNotIn(("y", "center"), pairs)

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
        if os.environ.get("DOTAGRAPH_SKIP_COMMITTED_SNAPSHOT_CHECK") == "1":
            self.skipTest("The refresh workflow validates the regenerated snapshot next")
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
        self.assertLessEqual(metrics["maxNearestNodeDistance"], 165.0)

    def test_generate_emits_741f_production_contract(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]
        now = datetime(2026, 9, 19, 8, 0, tzinfo=timezone.utc)
        rows = complete_match_rows()

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
        self.assertEqual(payload["coverage"]["immortalEvidenceStatus"], "available")
        self.assertIsNone(payload["coverage"]["immortalEvidenceReason"])


if __name__ == "__main__":
    unittest.main()
