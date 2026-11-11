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
    _normalize_immortal_pairs,
    _normalize_pairs,
    _pair_query,
    _request_json,
    _retry_after_seconds,
    _select_layout_relationships,
    add_stratz_evidence,
    collect_stratz_evidence,
    generate,
)
from dotagraph_pipeline.config import CURRENT_SCOPE
from dotagraph_pipeline.layout import layout_metrics
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

    @unittest.skipIf(
        os.environ.get("DOTAGRAPH_SKIP_SNAPSHOT_TEST") == "1",
        "The refresh workflow validates the new snapshot after generation",
    )
    def test_committed_snapshot_layout_quality(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]
        payload = __import__("json").loads(
            (repo_root / "public" / "data" / "current-matchups.json").read_text(
                encoding="utf-8"
            )
        )
        metrics = payload["layoutMetrics"]
        positions = {
            slug: (point["x"], point["y"])
            for slug, point in payload["positions"].items()
        }
        measured = layout_metrics(positions, [])
        for key in (
            "minimumNodeDistance",
            "medianNearestNodeDistance",
            "maxNearestNodeDistance",
        ):
            self.assertEqual(metrics[key], measured[key])

        self.assertEqual(metrics["coveredNodeCount"], 127)
        self.assertEqual(metrics["isolatedNodeCount"], 0)
        self.assertGreaterEqual(metrics["minimumNodeDistance"], 67.0)
        self.assertGreaterEqual(metrics["medianNearestNodeDistance"], 67.0)
        self.assertLessEqual(metrics["maxNearestNodeDistance"], 96.0)

    @staticmethod
    def production_pair_rows() -> list[dict[str, int]]:
        return [
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

    def test_generate_emits_741f_production_contract(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]
        now = datetime(2026, 9, 19, 8, 0, tzinfo=timezone.utc)
        rows = self.production_pair_rows()

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

    def test_stratz_enrichment_replaces_its_own_evidence_only(self) -> None:
        payload = {
            "relationships": [],
            "evidenceObservations": [{"provider": "OpenDota"}, {"provider": "STRATZ", "old": True}],
            "coverage": {"immortalEvidenceCount": 2},
        }
        replacement = {"provider": "STRATZ"}
        with patch(
            "dotagraph_pipeline.generate_current_bundle.collect_stratz_evidence",
            return_value=[replacement],
        ):
            count = add_stratz_evidence(
                payload, {}, end_epoch=CURRENT_SCOPE.start_epoch + 1,
                collected_at="2026-09-16T00:01:00Z", token="test-token",
                logger=configure_logging(),
            )
        self.assertEqual(count, 1)
        self.assertEqual(payload["evidenceObservations"], [{"provider": "OpenDota"}, replacement])
        self.assertEqual(payload["coverage"]["immortalEvidenceCount"], 2)

    def test_stratz_evidence_confirms_patch_and_keeps_headline_direction(self) -> None:
        module = "dotagraph_pipeline.generate_current_bundle"
        start = CURRENT_SCOPE.start_epoch
        end = start + 60
        players = [
            {"heroId": hero, "isRadiant": hero <= 5} for hero in range(1, 11)
        ]
        match = {
            "id": 100, "gameVersionId": 190, "rank": 80, "bracket": 8,
            "gameMode": 22, "lobbyType": 7, "didRadiantWin": True,
            "players": players,
        }
        rows = [
            {"match_id": 100, "start_time": start},
            {"match_id": 101, "start_time": start + 1},
            {"match_id": 102, "start_time": end},
        ]
        relationships = [{"sourceSlug": "dire-hero", "targetSlug": "radiant-hero"}]
        with (
            patch(f"{module}._request_json", return_value={"rows": rows}) as discovery,
            patch(f"{module}.game_version_id", return_value=190),
            patch(f"{module}.time.sleep"),
            patch(f"{module}.fetch_matches", return_value=[
                match, dict(match, id=101, gameVersionId=191),
            ]) as fetch,
        ):
            evidence = collect_stratz_evidence(
                relationships, {6: "dire-hero", 1: "radiant-hero"},
                end_epoch=end, collected_at="2026-09-16T00:01:00Z",
                token="test-token", logger=configure_logging(),
            )

        self.assertIn("avg_rank_tier%20%3D%2075", discovery.call_args.args[0].replace("+", "%20"))
        fetch.assert_called_once_with([100, 101], "test-token")
        self.assertEqual(len(evidence), 1)
        self.assertEqual(evidence[0]["provider"], "STRATZ")
        self.assertEqual(evidence[0]["sampleSize"], 1)
        self.assertEqual(evidence[0]["sourceWinRate"], 0)
        self.assertEqual(evidence[0]["scope"]["patch"], CURRENT_SCOPE.patch)

    def test_generate_warns_when_immortal_evidence_is_empty(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]
        now = datetime(2026, 9, 19, 8, 0, tzinfo=timezone.utc)
        rows = [
            dict(row, immortal_matches=0, immortal_radiant_wins=0)
            for row in self.production_pair_rows()
        ]

        logger = configure_logging()
        with patch(
            "dotagraph_pipeline.generate_current_bundle._fetch_pair_rows",
            return_value=rows,
        ), self.assertLogs(logger, level="WARNING") as logs:
            payload = generate(repo_root, now=now, logger=logger)

        self.assertTrue(payload["relationships"])
        self.assertEqual(payload["evidenceObservations"], [])
        self.assertEqual(payload["coverage"]["immortalEvidenceCount"], 0)
        self.assertIn('"event": "immortal_evidence_empty"', logs.output[0])
        self.assertIn('"reason": "no_immortal_pairs"', logs.output[0])


if __name__ == "__main__":
    unittest.main()
