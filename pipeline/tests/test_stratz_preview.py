from io import BytesIO
import json
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from dotagraph_pipeline.stratz_preview import PairCount, aggregate_immortal_pairs, fetch_matches


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
        with self.assertRaisesRegex(RuntimeError, r"^STRATZ returned HTTP 403\. Provider hint: access denied token\.$"):
            fetch_matches([9085800147], "test-token", rank_only=True)
