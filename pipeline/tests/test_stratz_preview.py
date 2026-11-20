from io import BytesIO
import json
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from dotagraph_pipeline.stratz_preview import PairCount, StratzNetworkDenied, aggregate_immortal_pairs, fetch_matches, verified_immortal_pairs


def match(match_id=1, patch=190, *, bracket=8, rank=80, radiant_won=True):
    return {
        "id": match_id,
        "gameVersionId": patch,
        "gameMode": "ALL_PICK_RANKED",
        "lobbyType": "RANKED",
        "didRadiantWin": radiant_won,
        "bracket": bracket,
        "rank": rank,
        "players": [{"heroId": hero, "isRadiant": hero <= 5} for hero in range(1, 11)],
    }


class StratzPreviewTests(unittest.TestCase):
    def test_counts_opponents_and_wins_once_per_match_and_patch(self):
        first = match()
        pairs = aggregate_immortal_pairs([
            first, first, match(2, radiant_won=False), match(3, patch=191),
        ])
        self.assertEqual(len(pairs), 50)
        self.assertEqual(pairs[(190, 1, 6)], PairCount(matches=2, first_wins=1))
        self.assertEqual(pairs[(191, 1, 6)], PairCount(matches=1, first_wins=1))
        self.assertNotIn((190, 1, 2), pairs)

    def test_rejects_combined_rank_and_invalid_matches(self):
        incomplete = match(4)
        incomplete["players"].pop()
        self.assertEqual(aggregate_immortal_pairs([
            match(bracket="DIVINE_IMMORTAL"), match(2, bracket=7, rank=75),
            match(3, bracket=None), incomplete, dict(match(5), lobbyType=0),
            match(6, rank=75), match(7, rank=None),
        ]), {})

    def test_credits_dire_when_the_lower_hero_id_is_on_dire(self):
        swapped = match(radiant_won=False)
        for player in swapped["players"]:
            player["isRadiant"] = not player["isRadiant"]
        pairs = aggregate_immortal_pairs([swapped])
        self.assertEqual(pairs[(190, 1, 6)], PairCount(matches=1, first_wins=1))

    @patch("dotagraph_pipeline.stratz_preview.build_opener")
    def test_fetch_requests_only_rank_fields_in_single_match_probe(self, opener):
        opener.return_value.open.return_value = BytesIO(b'{"data":{"match":{"actualRank":80,"averageRank":null,"rank":80,"bracket":8}}}')

        self.assertEqual(fetch_matches([9085800147], "test-token", rank_only=True), [
            {"actualRank": 80, "averageRank": None, "rank": 80, "bracket": 8},
        ])
        request = opener.return_value.open.call_args.args[0]
        self.assertEqual(request.get_header("Authorization"), "Bearer test-token")
        self.assertEqual(
            json.loads(request.data)["query"],
            "{ match(id: 9085800147) { actualRank averageRank rank bracket } }",
        )

    @patch("dotagraph_pipeline.stratz_preview.build_opener")
    def test_http_failure_filters_provider_details(self, opener):
        opener.return_value.open.side_effect = HTTPError(
            "https://api.stratz.com/graphql", 403, "provider response", {}, BytesIO(b'{"message":"Access denied for token sensitiveValue"}'),
        )
        with self.assertRaisesRegex(RuntimeError, r"^STRATZ returned HTTP 403\. Provider hint: access denied token\.$") as error:
            fetch_matches([9085800147], "test-token", rank_only=True)
        self.assertNotIsInstance(error.exception, StratzNetworkDenied)

    @patch("dotagraph_pipeline.stratz_preview.build_opener")
    def test_http_failure_identifies_network_denial(self, opener):
        opener.return_value.open.side_effect = HTTPError(
            "https://api.stratz.com/graphql", 403, "Forbidden", {},
            BytesIO(b'{"message":"Requests from this IP cannot access the API"}'),
        )
        with self.assertRaises(StratzNetworkDenied):
            fetch_matches([9085800147], "test-token", rank_only=True)


class StratzBulkTests(unittest.TestCase):
    @patch("dotagraph_pipeline.stratz_preview.time.sleep")
    @patch("dotagraph_pipeline.stratz_preview.query_stratz")
    def test_batches_and_deduplicates_requests_without_dropping_matches(self, query, sleep):
        ids = list(range(1, 206))
        query.side_effect = [{"matches": [{"id": i} for i in ids[start:start + 100]]} for start in (0, 100, 200)]
        result = fetch_matches(ids + [1], "test-token")
        self.assertEqual([row["id"] for row in result], ids)
        self.assertEqual(query.call_count, 3)
        self.assertEqual(sleep.call_count, 2)
        self.assertIn("matches(ids:", query.call_args_list[0].args[0])

    @patch("dotagraph_pipeline.stratz_preview.query_stratz")
    def test_rejects_missing_duplicate_and_unrequested_records(self, query):
        for rows in ([{"id": 1}], [{"id": 1}, {"id": 1}], [{"id": 1}, {"id": 3}], [{"id": 1}, None]):
            with self.subTest(rows=rows):
                query.return_value = {"matches": rows}
                with self.assertRaises(RuntimeError):
                    fetch_matches([1, 2], "test-token")

    @patch("dotagraph_pipeline.stratz_preview.time.sleep")
    @patch("dotagraph_pipeline.stratz_preview.build_opener")
    def test_long_provider_retry_never_retries_before_the_allowed_time(self, opener, sleep):
        opener.return_value.open.side_effect = HTTPError(
            "https://api.stratz.com/graphql", 429, "Too Many Requests",
            {"Retry-After": "3600"}, BytesIO(b""),
        )
        with self.assertRaisesRegex(RuntimeError, "later retry"):
            fetch_matches([1], "test-token")
        self.assertEqual(opener.return_value.open.call_count, 1)
        sleep.assert_not_called()

    def test_incomplete_classification_blocks_checkpoint_but_known_exclusions_do_not(self):
        self.assertEqual(verified_immortal_pairs([match(rank=75), match(patch=191)], 190), {})
        for record in (
            dict(match(), rank=None), dict(match(), gameVersionId=None),
            dict(match(), didRadiantWin=None), dict(match(), players=[]),
            dict(match(), gameMode=None),
        ):
            with self.subTest(record=record):
                with self.assertRaisesRegex(RuntimeError, "checkpoint unchanged"):
                    verified_immortal_pairs([record], 190)
