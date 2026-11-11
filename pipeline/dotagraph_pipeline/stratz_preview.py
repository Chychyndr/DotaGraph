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


def query_stratz(selection: str, token: str) -> dict:
    if not token:
        raise ValueError("STRATZ_API_TOKEN is missing.")
    request = Request(
        ENDPOINT,
        data=json.dumps({"query": "{ " + selection + " }"}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "STRATZ_API",
        },
    )
    opener = build_opener(NoRedirects())
    for attempt in range(3):
        try:
            with opener.open(request, timeout=20) as response:
                payload = json.load(response)
            break
        except HTTPError as exc:
            message = f"STRATZ returned HTTP {exc.code}."
            if exc.code == 403:
                message += " " + forbidden_hint(exc)
            if attempt == 2 or (exc.code != 429 and not 500 <= exc.code < 600):
                raise RuntimeError(message) from None
            retry_after = (exc.headers.get("Retry-After") or "").strip()
            delay = min(60, int(retry_after)) if retry_after.isascii() and retry_after.isdecimal() else 0
            time.sleep(max(delay, 2 ** (attempt + 1)))
        except (URLError, TimeoutError):
            if attempt == 2:
                raise RuntimeError("STRATZ request timed out or failed to connect.") from None
            time.sleep(2 ** (attempt + 1))
        except ValueError:
            raise RuntimeError("STRATZ returned invalid JSON.") from None
    if not isinstance(payload, dict) or payload.get("errors"):
        raise RuntimeError("STRATZ rejected the GraphQL query.")
    data = payload.get("data")
    if not isinstance(data, dict):
        raise RuntimeError("STRATZ response has no data object.")
    return data


def fetch_matches(ids: list[int], token: str, *, rank_only: bool = False) -> list[dict]:
    if not ids or any(type(match_id) is not int or match_id <= 0 for match_id in ids):
        raise ValueError("Provide positive match IDs.")
    fields = RANK_FIELDS if rank_only else MATCH_FIELDS
    matches = []
    for index, match_id in enumerate(dict.fromkeys(ids)):
        if index:
            time.sleep(1)
        data = query_stratz(f"match(id: {match_id}) {{ {fields} }}", token)
        row = data.get("match")
        if row is None:
            continue
        if not isinstance(row, dict) or (not rank_only and row.get("id") != match_id):
            raise RuntimeError("STRATZ returned an invalid match.")
        matches.append(row)
    return matches


def game_version_id(patch: str, token: str) -> int:
    data = query_stratz("constants { gameVersions { id name } }", token)
    constants = data.get("constants")
    versions = constants.get("gameVersions") if isinstance(constants, dict) else None
    if isinstance(versions, list):
        for row in versions:
            if (
                isinstance(row, dict) and row.get("name") == patch
                and type(row.get("id")) is int and row["id"] > 0
            ):
                return row["id"]
    raise RuntimeError(f"STRATZ did not resolve game version {patch}.")


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
        time.sleep(1)
        matches = fetch_matches(ids, token)
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
