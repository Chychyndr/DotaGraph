from __future__ import annotations

import argparse
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .layout import WeightedEdge, compute_layout, layout_metrics


PATCH = "7.41e"
PATCH_START = "2026-08-01T00:00:00Z"
PATCH_END_EXCLUSIVE = "2026-09-15T00:00:00Z"
PATCH_START_EPOCH = 1785542400
PATCH_END_EPOCH = 1789430400

RANK_SCOPE = "ancient_plus"
AVG_RANK_TIER_MIN = 60
GAME_MODE = 22
LOBBY_TYPE = 7
MIN_SAMPLE = 500
TOP_PER_DIRECTION = 5

OPENDOTA_BASE_URL = "https://api.opendota.com/api"
USER_AGENT = "DotaGraph/0.1 (+https://github.com/Chychyndr/DotaGraph)"


@dataclass
class PairObservation:
    first_slug: str
    second_slug: str
    matches: int = 0
    first_wins: int = 0


@dataclass(frozen=True)
class DirectedAffinity:
    source: str
    target: str
    matches: int
    source_win_rate: float
    baseline_adjusted_delta: float
    layout_score: float


def _request_json(url: str, *, attempts: int = 4) -> Any:
    last_error: Exception | None = None

    for attempt in range(attempts):
        request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        try:
            with urlopen(request, timeout=120) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            detail = RuntimeError(
                f"OpenDota HTTP {exc.code} for {exc.url}: {body[:2000]}"
            )
            last_error = detail
            if exc.code not in {429, 500, 502, 503, 504}:
                raise detail from exc
        except (URLError, TimeoutError) as exc:
            last_error = exc

        if attempt + 1 < attempts:
            time.sleep(2 ** attempt)

    if last_error is None:
        raise RuntimeError("OpenDota request failed without an error")
    raise RuntimeError(f"OpenDota request failed after {attempts} attempts: {last_error}") from last_error


def _api_url(path: str, params: dict[str, str] | None = None) -> str:
    values = dict(params or {})
    api_key = os.getenv("OPENDOTA_API_KEY")
    if api_key:
        values["api_key"] = api_key

    query = urlencode(values)
    return f"{OPENDOTA_BASE_URL}{path}" + (f"?{query}" if query else "")


def _load_catalog(repo_root: Path) -> set[str]:
    catalog_path = repo_root / "src" / "data" / "heroCatalog.json"
    raw = json.loads(catalog_path.read_text(encoding="utf-8"))
    return {str(hero["slug"]) for hero in raw}


def _load_opendota_hero_map(catalog_slugs: set[str]) -> dict[int, str]:
    constants = _request_json(_api_url("/constants/heroes"))
    result: dict[int, str] = {}

    for raw_id, hero in constants.items():
        if not isinstance(hero, dict):
            continue

        internal_name = str(hero.get("name", ""))
        prefix = "npc_dota_hero_"
        if not internal_name.startswith(prefix):
            continue

        slug = internal_name.removeprefix(prefix)
        if slug in catalog_slugs:
            result[int(raw_id)] = slug

    return result


def _pair_query() -> str:
    return f"""
WITH scoped_matches AS (
  SELECT radiant_win, radiant_team, dire_team
  FROM public_matches
  WHERE start_time >= {PATCH_START_EPOCH}
    AND start_time < {PATCH_END_EPOCH}
    AND avg_rank_tier >= {AVG_RANK_TIER_MIN}
    AND game_mode = {GAME_MODE}
    AND lobby_type = {LOBBY_TYPE}
    AND array_length(radiant_team, 1) = 5
    AND array_length(dire_team, 1) = 5
)
SELECT
  radiant_hero.hero_id AS radiant_hero_id,
  dire_hero.hero_id AS dire_hero_id,
  COUNT(*)::bigint AS matches,
  SUM(CASE WHEN radiant_win THEN 1 ELSE 0 END)::bigint AS radiant_wins
FROM scoped_matches
CROSS JOIN LATERAL unnest(radiant_team) AS radiant_hero(hero_id)
CROSS JOIN LATERAL unnest(dire_team) AS dire_hero(hero_id)
GROUP BY radiant_hero.hero_id, dire_hero.hero_id
ORDER BY radiant_hero.hero_id, dire_hero.hero_id
""".strip()


def _fetch_pair_rows() -> list[dict[str, Any]]:
    payload = _request_json(_api_url("/explorer", {"sql": _pair_query()}))

    if not isinstance(payload, dict):
        raise RuntimeError("OpenDota Explorer returned a non-object response")
    if payload.get("err"):
        raise RuntimeError(f"OpenDota Explorer error: {payload['err']}")

    rows = payload.get("rows")
    if not isinstance(rows, list):
        raise RuntimeError("OpenDota Explorer response did not contain rows")

    return [row for row in rows if isinstance(row, dict)]


def _normalize_pairs(
    rows: list[dict[str, Any]],
    hero_map: dict[int, str],
) -> dict[tuple[str, str], PairObservation]:
    pairs: dict[tuple[str, str], PairObservation] = {}

    for row in rows:
        radiant_id = int(row["radiant_hero_id"])
        dire_id = int(row["dire_hero_id"])
        radiant_slug = hero_map.get(radiant_id)
        dire_slug = hero_map.get(dire_id)

        if radiant_slug is None or dire_slug is None or radiant_slug == dire_slug:
            continue

        matches = int(row["matches"])
        radiant_wins = int(row["radiant_wins"])
        first_slug, second_slug = sorted((radiant_slug, dire_slug))
        key = (first_slug, second_slug)

        observation = pairs.setdefault(
            key,
            PairObservation(first_slug=first_slug, second_slug=second_slug),
        )
        observation.matches += matches

        if radiant_slug == first_slug:
            observation.first_wins += radiant_wins
        else:
            observation.first_wins += matches - radiant_wins

    return pairs


def _hero_baselines(
    pairs: dict[tuple[str, str], PairObservation],
) -> dict[str, float]:
    wins: dict[str, int] = defaultdict(int)
    games: dict[str, int] = defaultdict(int)

    for observation in pairs.values():
        wins[observation.first_slug] += observation.first_wins
        games[observation.first_slug] += observation.matches
        wins[observation.second_slug] += observation.matches - observation.first_wins
        games[observation.second_slug] += observation.matches

    return {
        slug: wins[slug] / games[slug]
        for slug in games
        if games[slug] > 0
    }


def _build_affinities(
    pairs: dict[tuple[str, str], PairObservation],
    baselines: dict[str, float],
) -> list[DirectedAffinity]:
    candidates: list[DirectedAffinity] = []

    for observation in pairs.values():
        if observation.matches < MIN_SAMPLE:
            continue

        first_baseline = baselines.get(observation.first_slug)
        second_baseline = baselines.get(observation.second_slug)
        if first_baseline is None or second_baseline is None:
            continue

        first_win_rate = observation.first_wins / observation.matches
        expected_first = 0.5 + (first_baseline - second_baseline) / 2.0
        expected_first = max(0.05, min(0.95, expected_first))
        delta = first_win_rate - expected_first

        if abs(delta) < 1e-9:
            continue

        if delta > 0:
            source = observation.first_slug
            target = observation.second_slug
            source_win_rate = first_win_rate
        else:
            source = observation.second_slug
            target = observation.first_slug
            source_win_rate = 1.0 - first_win_rate

        sample_factor = math.sqrt(min(observation.matches, 10_000) / MIN_SAMPLE)
        layout_score = abs(delta) * sample_factor

        candidates.append(
            DirectedAffinity(
                source=source,
                target=target,
                matches=observation.matches,
                source_win_rate=source_win_rate,
                baseline_adjusted_delta=abs(delta),
                layout_score=layout_score,
            )
        )

    candidates.sort(
        key=lambda edge: (
            -edge.layout_score,
            -edge.matches,
            edge.source,
            edge.target,
        )
    )
    return candidates


def _select_layout_affinities(
    candidates: list[DirectedAffinity],
) -> list[DirectedAffinity]:
    outgoing: dict[str, list[DirectedAffinity]] = defaultdict(list)
    incoming: dict[str, list[DirectedAffinity]] = defaultdict(list)

    for edge in candidates:
        outgoing[edge.source].append(edge)
        incoming[edge.target].append(edge)

    selected_keys: set[tuple[str, str]] = set()
    selected: list[DirectedAffinity] = []

    def add(edge: DirectedAffinity) -> None:
        key = tuple(sorted((edge.source, edge.target)))
        if key in selected_keys:
            return
        selected_keys.add(key)
        selected.append(edge)

    for edges in outgoing.values():
        for edge in edges[:TOP_PER_DIRECTION]:
            add(edge)

    for edges in incoming.values():
        for edge in edges[:TOP_PER_DIRECTION]:
            add(edge)

    selected.sort(key=lambda edge: (edge.source, edge.target))
    return selected


def _weighted_edges(
    selected: list[DirectedAffinity],
) -> list[WeightedEdge]:
    if not selected:
        return []

    scores = [edge.layout_score for edge in selected]
    low = min(scores)
    high = max(scores)
    span = high - low

    weighted = []
    for edge in selected:
        normalized = 1.0 if span <= 1e-12 else (edge.layout_score - low) / span
        weight = 0.25 + normalized * 0.75
        weighted.append(WeightedEdge(edge.source, edge.target, weight))

    return weighted


def generate(repo_root: Path) -> dict[str, Any]:
    catalog_slugs = _load_catalog(repo_root)
    hero_map = _load_opendota_hero_map(catalog_slugs)
    rows = _fetch_pair_rows()
    pairs = _normalize_pairs(rows, hero_map)
    baselines = _hero_baselines(pairs)
    candidates = _build_affinities(pairs, baselines)
    selected = _select_layout_affinities(candidates)
    weighted_edges = _weighted_edges(selected)

    covered_slugs = set(hero_map.values())
    missing_from_source = sorted(catalog_slugs - covered_slugs)

    positions = compute_layout(catalog_slugs, weighted_edges)
    metrics = layout_metrics(positions, weighted_edges)

    return {
        "schemaVersion": 1,
        "kind": "real-matchup-layout-evaluation",
        "patch": PATCH,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "scope": {
            "source": "OpenDota",
            "sourceEndpoint": "/api/explorer",
            "patchWindowStart": PATCH_START,
            "patchWindowEndExclusive": PATCH_END_EXCLUSIVE,
            "rankScope": RANK_SCOPE,
            "openDotaAvgRankTierMin": AVG_RANK_TIER_MIN,
            "gameMode": GAME_MODE,
            "lobbyType": LOBBY_TYPE,
            "minimumPairSample": MIN_SAMPLE,
            "topPerDirectionForLayout": TOP_PER_DIRECTION,
        },
        "method": {
            "purpose": "layout-only evaluation; not the final production counter-ranking formula",
            "pairStrength": "observed pair win rate minus baseline expectation 0.5 + (baselineA - baselineB) / 2",
            "sampleWeight": "sqrt(min(sampleSize, 10000) / 500)",
            "layout": "deterministic weighted force-directed layout with collision relaxation",
            "rawStatisticsPublished": False,
        },
        "coverage": {
            "catalogHeroCount": len(catalog_slugs),
            "openDotaMappedHeroCount": len(covered_slugs),
            "missingHeroSlugs": missing_from_source,
            "qualifyingPairCount": sum(1 for pair in pairs.values() if pair.matches >= MIN_SAMPLE),
            "layoutAffinityCount": len(selected),
        },
        "metrics": metrics,
        "positions": {
            slug: {"x": x, "y": y}
            for slug, (x, y) in sorted(positions.items())
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate real-data DotaGraph layout for patch 7.41e")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("src/data/layout-7.41e.json"),
        help="Output JSON path relative to repository root",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    output_path = args.output
    if not output_path.is_absolute():
        output_path = repo_root / output_path

    payload = generate(repo_root)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        f"Generated {output_path} with "
        f"{payload['coverage']['layoutAffinityCount']} layout affinities; "
        f"p95 edge distance={payload['metrics']['p95Distance']} px"
    )


if __name__ == "__main__":
    main()
