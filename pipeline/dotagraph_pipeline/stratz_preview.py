"""Fetch a bounded STRATZ sample and count opposing hero pairs by patch."""

from __future__ import annotations

import argparse
from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass
import json
import os
import re
import time
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener


ENDPOINT = "https://api.stratz.com/graphql"
MAX_MATCH_IDS = 20
IMMORTAL_RANK = 80
IMMORTAL_BRACKET = 8
RANK_FIELDS = "actualRank averageRank rank bracket"
MATCH_FIELDS = f"""
    id gameVersionId gameMode lobbyType didRadiantWin {RANK_FIELDS}
    players {{ heroId isRadiant }}
"""


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def forbidden_hint(error: HTTPError) -> str:
    if error.headers.get("cf-mitigated") == "challenge":
        return "Cloudflare challenge."
    # The repository logs are public. Report known error words only, never
    # the response text, authorization header, or reflected request values.
    safe_words = set(
        "access account address api authentication authorization blocked "
        "cloudflare denied disabled expired forbidden host invalid ip key "
        "limit missing network permission policy proxy rate restricted "
        "secret token unauthorized user agent required request origin "
        "not allowed plan subscription whitelisted allowlisted".split()
    )
    body = error.read(2048).decode("utf-8", errors="replace").lower() if error.fp else ""
    words = re.findall(r"[a-z]+", body)
    hint = " ".join(word for word in words if word in safe_words)[:160]
    return f"Provider hint: {hint}." if hint else "No recognized reason in the response."


def fetch_matches(ids: list[int], token: str, *, rank_only: bool = False) -> list[dict]:
    if not ids or len(ids) > MAX_MATCH_IDS or any(type(i) is not int or i <= 0 for i in ids):
        raise ValueError(f"Provide one to {MAX_MATCH_IDS} positive match IDs.")
    if not token:
        raise ValueError("STRATZ_API_TOKEN is missing.")
    ids = list(dict.fromkeys(ids))
    fields = RANK_FIELDS if rank_only else MATCH_FIELDS
    if len(ids) == 1:
        selection = f"match(id: {ids[0]}) {{ {fields} }}"
    else:
        selection = f"matches(ids: {json.dumps(ids)}) {{ {fields} }}"
    request = Request(
        ENDPOINT,
        data=json.dumps({"query": "{ " + selection + " }"}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "STRATZ_API",
        },
    )
    try:
        with build_opener(NoRedirects()).open(request, timeout=25) as response:
            payload = json.load(response)
    except HTTPError as exc:
        message = f"STRATZ returned HTTP {exc.code}."
        if exc.code == 403:
            message += " " + forbidden_hint(exc)
        raise RuntimeError(message) from None
    except (URLError, TimeoutError, ValueError):
        raise RuntimeError("STRATZ request failed or returned invalid JSON.") from None
    if not isinstance(payload, dict) or payload.get("errors"):
        raise RuntimeError("STRATZ rejected the GraphQL query.")
    data = payload.get("data")
    if not isinstance(data, dict):
        raise RuntimeError("STRATZ response has no data object.")
    rows = [data.get("match")] if len(ids) == 1 else data.get("matches")
    if not isinstance(rows, list) or any(row is not None and not isinstance(row, dict) for row in rows):
        raise RuntimeError("STRATZ response has an invalid match list.")
    return [row for row in rows if row is not None]


@dataclass
class PairCount:
    matches: int = 0
    first_wins: int = 0


def aggregate_immortal_pairs(matches: Iterable[dict]) -> dict[tuple[int, int, int], PairCount]:
    pairs: dict[tuple[int, int, int], PairCount] = {}
    seen: set[int] = set()
    for match in matches:
        # Require both rank fields observed in the STRATZ Immortal sample.
        if match.get("rank") != IMMORTAL_RANK or match.get("bracket") != IMMORTAL_BRACKET:
            continue
        if match.get("gameMode") not in (22, "ALL_PICK_RANKED") or match.get("lobbyType") not in (7, "RANKED"):
            continue
        match_id = match.get("id")
        patch_id = match.get("gameVersionId")
        radiant_won = match.get("didRadiantWin")
        players = match.get("players")
        if (
            type(match_id) is not int or match_id <= 0 or match_id in seen
            or type(patch_id) is not int or patch_id <= 0
            or type(radiant_won) is not bool or not isinstance(players, list)
        ):
            continue
        teams: dict[bool, list[int]] = {True: [], False: []}
        for player in players:
            if not isinstance(player, dict):
                continue
            hero_id = player.get("heroId")
            is_radiant = player.get("isRadiant")
            if type(hero_id) is int and hero_id > 0 and type(is_radiant) is bool:
                teams[is_radiant].append(hero_id)
        radiant, dire = teams[True], teams[False]
        if len(players) != 10 or len(radiant) != 5 or len(dire) != 5 or len(set(radiant + dire)) != 10:
            continue
        seen.add(match_id)
        for radiant_hero in radiant:
            for dire_hero in dire:
                first, second = sorted((radiant_hero, dire_hero))
                count = pairs.setdefault((patch_id, first, second), PairCount())
                count.matches += 1
                count.first_wins += int(radiant_won == (first == radiant_hero))
    return pairs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("match_ids", metavar="MATCH_ID", type=int, nargs="+")
    args = parser.parse_args()
    token = os.environ.get("STRATZ_API_TOKEN", "").strip()
    ids = args.match_ids
    if len(ids) > MAX_MATCH_IDS:
        parser.error(f"Provide at most {MAX_MATCH_IDS} match IDs.")
    try:
        rank_sample = fetch_matches(ids[:1], token, rank_only=True)
        print("Single match rank fields:", json.dumps(rank_sample), flush=True)
        matches = []
        for match_id in dict.fromkeys(ids):
            # A short pause keeps the bounded preview within per-second quotas.
            time.sleep(1)
            matches.extend(fetch_matches([match_id], token))
    except (ValueError, RuntimeError) as exc:
        raise SystemExit(str(exc)) from None

    pairs = aggregate_immortal_pairs(matches)
    print(json.dumps({
        "requestedMatches": len(set(ids)),
        "returnedMatches": len(matches),
        "brackets": dict(Counter(str(match.get("bracket")) for match in matches)),
        "eligibleMatchCount": sum(pair.matches for pair in pairs.values()) // 25,
        "immortalPairCount": len(pairs),
        "patchIds": sorted({patch_id for patch_id, _, _ in pairs}),
        "pairExamples": [
            {
                "patchId": patch_id,
                "firstHeroId": first,
                "secondHeroId": second,
                "matches": pairs[(patch_id, first, second)].matches,
                "firstWins": pairs[(patch_id, first, second)].first_wins,
            }
            for patch_id, first, second in sorted(pairs)[:5]
        ],
    }, indent=2))


if __name__ == "__main__":
    main()
