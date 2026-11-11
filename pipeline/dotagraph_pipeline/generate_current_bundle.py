from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .config import CURRENT_SCOPE, generation_end_epoch
from .layout import (
    WeightedEdge,
    compute_layout,
    layout_metrics,
    spread_layout_positions,
)
from .logging_utils import configure_logging, log_event
from .ranking import PairObservation, RankedRelationship, hero_totals, rank_relationships

from .stratz_preview import aggregate_immortal_pairs, fetch_matches, game_version_id


OPENDOTA_BASE_URL = "https://api.opendota.com/api"
USER_AGENT = "DotaGraph/0.1 (+https://github.com/Chychyndr/DotaGraph)"
MIN_QUERY_SECONDS = 6 * 60 * 60
QUERY_CHUNK_SECONDS = 24 * 60 * 60
MAX_RETRY_DELAY_SECONDS = 120
MAX_LAYOUT_NEAREST_DISTANCE = 96.0


def _retry_after_seconds(body: str, headers: Any) -> float | None:
    candidates: list[float] = []

    if headers is not None:
        raw_header = headers.get("Retry-After")
        try:
            value = float(raw_header)
        except (TypeError, ValueError):
            pass
        else:
            if value > 0:
                candidates.append(value)

    try:
        payload = json.loads(body)
    except (json.JSONDecodeError, TypeError):
        payload = None

    if isinstance(payload, dict):
        raw_body = payload.get("retry_after")
        try:
            value = float(raw_body)
        except (TypeError, ValueError):
            pass
        else:
            if value > 0:
                candidates.append(value)

    return max(candidates) if candidates else None


def _request_json(
    url: str,
    *,
    logger: logging.Logger,
    attempts: int = 6,
) -> Any:
    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        started = time.monotonic()
        suggested_retry_seconds: float | None = None
        log_event(logger, "http_request_start", attempt=attempt, url=url.split("?")[0])
        request = Request(
            url,
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        )
        try:
            with urlopen(request, timeout=120) as response:
                payload = json.loads(response.read().decode("utf-8"))
                log_event(
                    logger,
                    "http_request_success",
                    attempt=attempt,
                    status=response.status,
                    elapsedSeconds=round(time.monotonic() - started, 3),
                )
                return payload
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            suggested_retry_seconds = _retry_after_seconds(body, exc.headers)
            last_error = RuntimeError(
                f"OpenDota HTTP {exc.code}: {body[:2000]}"
            )
            log_event(
                logger,
                "http_request_error",
                level=logging.WARNING,
                attempt=attempt,
                status=exc.code,
                body=body[:500],
                retryAfterSeconds=suggested_retry_seconds,
                elapsedSeconds=round(time.monotonic() - started, 3),
            )
            if exc.code != 429 and not 500 <= exc.code < 600:
                raise last_error from exc
        except (URLError, TimeoutError, ConnectionError) as exc:
            last_error = exc
            log_event(
                logger,
                "http_request_error",
                level=logging.WARNING,
                attempt=attempt,
                error=type(exc).__name__,
                detail=str(exc),
                elapsedSeconds=round(time.monotonic() - started, 3),
            )

        if attempt < attempts:
            delay = min(MAX_RETRY_DELAY_SECONDS, 2**attempt)
            if suggested_retry_seconds is not None:
                delay = max(
                    delay,
                    min(MAX_RETRY_DELAY_SECONDS, suggested_retry_seconds),
                )
            log_event(logger, "http_retry_wait", attempt=attempt, seconds=delay)
            time.sleep(delay)

    raise RuntimeError(
        f"OpenDota request failed after {attempts} attempts: {last_error}"
    ) from last_error


def _api_url(path: str, params: dict[str, str] | None = None) -> str:
    values = dict(params or {})
    api_key = os.getenv("OPENDOTA_API_KEY")
    if api_key:
        values["api_key"] = api_key
    query = urlencode(values)
    return f"{OPENDOTA_BASE_URL}{path}" + (f"?{query}" if query else "")


def _load_catalog(repo_root: Path) -> set[str]:
    raw = json.loads(
        (repo_root / "src" / "data" / "heroCatalog.json").read_text(
            encoding="utf-8"
        )
    )
    return {str(hero["slug"]) for hero in raw}


def _load_opendota_hero_map(
    repo_root: Path,
    catalog_slugs: set[str],
) -> dict[int, str]:
    payload = json.loads(
        (repo_root / "pipeline" / "data" / "opendota_hero_ids.json").read_text(
            encoding="utf-8"
        )
    )
    raw_heroes = payload.get("heroes")
    if not isinstance(raw_heroes, dict):
        raise RuntimeError("Vendored OpenDota hero-id mapping is malformed")

    result = {
        int(raw_id): str(slug)
        for raw_id, slug in raw_heroes.items()
        if str(slug) in catalog_slugs
    }
    missing = sorted(catalog_slugs - set(result.values()))
    if missing:
        raise RuntimeError(
            "Vendored OpenDota hero-id mapping is missing: " + ", ".join(missing)
        )
    return result


def _pair_query(start_epoch: int, end_epoch: int) -> str:
    scope = CURRENT_SCOPE
    return f"""
WITH scoped_matches AS (
  SELECT radiant_win, radiant_team, dire_team, avg_rank_tier
  FROM public_matches
  WHERE start_time >= {start_epoch}
    AND start_time < {end_epoch}
    AND avg_rank_tier >= {scope.avg_rank_tier_min}
    AND game_mode = {scope.game_mode}
    AND lobby_type = {scope.lobby_type}
    AND array_length(radiant_team, 1) = 5
    AND array_length(dire_team, 1) = 5
)
SELECT
  radiant_hero.hero_id AS radiant_hero_id,
  dire_hero.hero_id AS dire_hero_id,
  COUNT(*)::bigint AS matches,
  SUM(CASE WHEN radiant_win THEN 1 ELSE 0 END)::bigint AS radiant_wins,
  COUNT(*) FILTER (
    WHERE avg_rank_tier >= {scope.immortal_avg_rank_tier_min}
  )::bigint AS immortal_matches,
  SUM(
    CASE
      WHEN avg_rank_tier >= {scope.immortal_avg_rank_tier_min} AND radiant_win
      THEN 1
      ELSE 0
    END
  )::bigint AS immortal_radiant_wins
FROM scoped_matches
CROSS JOIN LATERAL unnest(radiant_team) AS radiant_hero(hero_id)
CROSS JOIN LATERAL unnest(dire_team) AS dire_hero(hero_id)
GROUP BY radiant_hero.hero_id, dire_hero.hero_id
""".strip()


def _is_timeout(message: str) -> bool:
    return "timeout" in message.lower()


def _fetch_range(
    start_epoch: int,
    end_epoch: int,
    *,
    logger: logging.Logger,
) -> list[dict[str, Any]]:
    duration = end_epoch - start_epoch
    log_event(
        logger,
        "opendota_chunk_start",
        startEpoch=start_epoch,
        endEpoch=end_epoch,
        durationSeconds=duration,
    )

    try:
        payload = _request_json(
            _api_url("/explorer", {"sql": _pair_query(start_epoch, end_epoch)}),
            logger=logger,
        )
    except RuntimeError as exc:
        if not _is_timeout(str(exc)) or duration <= MIN_QUERY_SECONDS:
            raise
        midpoint = start_epoch + duration // 2
        log_event(
            logger,
            "opendota_chunk_split",
            level=logging.WARNING,
            startEpoch=start_epoch,
            endEpoch=end_epoch,
            midpointEpoch=midpoint,
            reason="request_timeout",
        )
        return _fetch_range(
            start_epoch, midpoint, logger=logger
        ) + _fetch_range(midpoint, end_epoch, logger=logger)

    if not isinstance(payload, dict):
        raise RuntimeError("OpenDota Explorer returned a non-object response")

    if payload.get("err"):
        message = str(payload["err"])
        if _is_timeout(message) and duration > MIN_QUERY_SECONDS:
            midpoint = start_epoch + duration // 2
            log_event(
                logger,
                "opendota_chunk_split",
                level=logging.WARNING,
                startEpoch=start_epoch,
                endEpoch=end_epoch,
                midpointEpoch=midpoint,
                reason=message[:200],
            )
            return _fetch_range(
                start_epoch, midpoint, logger=logger
            ) + _fetch_range(midpoint, end_epoch, logger=logger)
        raise RuntimeError(f"OpenDota Explorer error: {message}")

    rows = payload.get("rows")
    if not isinstance(rows, list):
        raise RuntimeError("OpenDota Explorer response did not contain rows")

    result = [row for row in rows if isinstance(row, dict)]
    log_event(
        logger,
        "opendota_chunk_success",
        startEpoch=start_epoch,
        endEpoch=end_epoch,
        rowCount=len(result),
    )
    return result


def _fetch_pair_rows(
    end_epoch: int,
    *,
    logger: logging.Logger,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    start_epoch = CURRENT_SCOPE.start_epoch
    chunk_index = 0

    while start_epoch < end_epoch:
        chunk_index += 1
        chunk_end = min(start_epoch + QUERY_CHUNK_SECONDS, end_epoch)
        chunk_rows = _fetch_range(start_epoch, chunk_end, logger=logger)
        rows.extend(chunk_rows)
        log_event(
            logger,
            "opendota_chunk_accumulated",
            chunkIndex=chunk_index,
            chunkRows=len(chunk_rows),
            totalRows=len(rows),
        )
        start_epoch = chunk_end
        time.sleep(0.2)

    return rows


def _normalize_pairs(
    rows: list[dict[str, Any]],
    hero_map: dict[int, str],
) -> list[PairObservation]:
    aggregated: dict[tuple[str, str], list[int]] = {}

    for row in rows:
        radiant_slug = hero_map.get(int(row["radiant_hero_id"]))
        dire_slug = hero_map.get(int(row["dire_hero_id"]))
        if radiant_slug is None or dire_slug is None or radiant_slug == dire_slug:
            continue

        matches = int(row["matches"])
        radiant_wins = int(row["radiant_wins"])
        first_slug, second_slug = sorted((radiant_slug, dire_slug))
        key = (first_slug, second_slug)
        totals = aggregated.setdefault(key, [0, 0])
        totals[0] += matches
        totals[1] += (
            radiant_wins
            if radiant_slug == first_slug
            else matches - radiant_wins
        )

    return [
        PairObservation(
            first_slug=first_slug,
            second_slug=second_slug,
            matches=values[0],
            first_wins=values[1],
        )
        for (first_slug, second_slug), values in sorted(aggregated.items())
    ]


def _normalize_immortal_pairs(
    rows: list[dict[str, Any]],
    hero_map: dict[int, str],
) -> list[PairObservation]:
    aggregated: dict[tuple[str, str], list[int]] = {}

    for row in rows:
        radiant_slug = hero_map.get(int(row["radiant_hero_id"]))
        dire_slug = hero_map.get(int(row["dire_hero_id"]))
        if radiant_slug is None or dire_slug is None or radiant_slug == dire_slug:
            continue

        matches = int(row.get("immortal_matches", 0))
        radiant_wins = int(row.get("immortal_radiant_wins", 0))
        if matches <= 0:
            continue
        if radiant_wins < 0 or radiant_wins > matches:
            raise RuntimeError("OpenDota Immortal aggregate has invalid win counts")

        first_slug, second_slug = sorted((radiant_slug, dire_slug))
        key = (first_slug, second_slug)
        totals = aggregated.setdefault(key, [0, 0])
        totals[0] += matches
        totals[1] += (
            radiant_wins
            if radiant_slug == first_slug
            else matches - radiant_wins
        )

    return [
        PairObservation(
            first_slug=first_slug,
            second_slug=second_slug,
            matches=values[0],
            first_wins=values[1],
        )
        for (first_slug, second_slug), values in sorted(aggregated.items())
    ]


def _select_layout_relationships(
    ranked: list[RankedRelationship],
    *,
    neighbors_per_hero: int = 5,
) -> list[RankedRelationship]:
    incident: dict[str, list[RankedRelationship]] = {}

    for relationship in ranked:
        incident.setdefault(relationship.source, []).append(relationship)
        incident.setdefault(relationship.target, []).append(relationship)

    selected: dict[tuple[str, str], RankedRelationship] = {}
    limit = max(1, neighbors_per_hero)

    for hero_slug in sorted(incident):
        relationships = sorted(
            incident[hero_slug],
            key=lambda item: (
                -item.baseline_adjusted_delta,
                -item.sample_size,
                item.source,
                item.target,
            ),
        )
        for relationship in relationships[:limit]:
            pair_key = tuple(sorted((relationship.source, relationship.target)))
            selected[pair_key] = relationship

    return sorted(
        selected.values(),
        key=lambda item: (
            -item.baseline_adjusted_delta,
            -item.sample_size,
            item.source,
            item.target,
        ),
    )


def _ensure_layout_neighbors(
    selected: list[RankedRelationship],
    fallback_candidates: list[RankedRelationship],
    hero_slugs: set[str],
    *,
    minimum_neighbors: int = 2,
) -> list[RankedRelationship]:
    selected_by_pair = {
        tuple(sorted((relationship.source, relationship.target))): relationship
        for relationship in selected
    }
    degrees = {slug: 0 for slug in hero_slugs}

    for relationship in selected_by_pair.values():
        degrees[relationship.source] = degrees.get(relationship.source, 0) + 1
        degrees[relationship.target] = degrees.get(relationship.target, 0) + 1

    incident: dict[str, list[RankedRelationship]] = {}
    for relationship in fallback_candidates:
        incident.setdefault(relationship.source, []).append(relationship)
        incident.setdefault(relationship.target, []).append(relationship)

    for hero_slug in sorted(hero_slugs):
        if degrees.get(hero_slug, 0) >= minimum_neighbors:
            continue

        candidates = sorted(
            incident.get(hero_slug, []),
            key=lambda item: (
                -item.baseline_adjusted_delta,
                -item.sample_size,
                item.source,
                item.target,
            ),
        )

        for relationship in candidates:
            pair_key = tuple(sorted((relationship.source, relationship.target)))
            if pair_key in selected_by_pair:
                continue

            selected_by_pair[pair_key] = relationship
            degrees[relationship.source] = degrees.get(relationship.source, 0) + 1
            degrees[relationship.target] = degrees.get(relationship.target, 0) + 1

            if degrees.get(hero_slug, 0) >= minimum_neighbors:
                break

    return sorted(
        selected_by_pair.values(),
        key=lambda item: (
            -item.baseline_adjusted_delta,
            -item.sample_size,
            item.source,
            item.target,
        ),
    )


def _layout_edges(
    relationships: list[RankedRelationship],
) -> list[WeightedEdge]:
    if not relationships:
        return []

    scores = [relationship.ranking_score for relationship in relationships]
    low = min(scores)
    high = max(scores)
    span = high - low

    return [
        WeightedEdge(
            relationship.source,
            relationship.target,
            1.0
            if span <= 1e-12
            else 0.25 + (relationship.ranking_score - low) / span * 0.75,
        )
        for relationship in relationships
    ]


def _iso_from_epoch(epoch: int) -> str:
    return (
        datetime.fromtimestamp(epoch, tz=timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )


STRATZ_LOOKBACK_SECONDS = 24 * 60 * 60
STRATZ_CANDIDATE_LIMIT = 120


def collect_stratz_evidence(
    relationships: list[dict[str, Any]],
    hero_map: dict[int, str],
    *,
    end_epoch: int,
    collected_at: str,
    token: str,
    logger: logging.Logger,
    candidate_limit: int = STRATZ_CANDIDATE_LIMIT,
) -> list[dict[str, Any]]:
    scope = CURRENT_SCOPE
    start_epoch = max(scope.start_epoch, end_epoch - STRATZ_LOOKBACK_SECONDS)
    if start_epoch >= end_epoch:
        return []
    # OpenDota folds Immortal 80 into average medal 75. Use 75 as a
    # discovery filter only. STRATZ independently verifies rank and patch.
    sql = f"""
SELECT match_id, start_time FROM public_matches
WHERE avg_rank_tier = 75
  AND start_time >= {start_epoch} AND start_time < {end_epoch}
  AND game_mode = {scope.game_mode} AND lobby_type = {scope.lobby_type}
  AND array_length(radiant_team, 1) = 5 AND array_length(dire_team, 1) = 5
ORDER BY start_time DESC, match_id DESC
LIMIT {candidate_limit}
""".strip()
    data = _request_json(_api_url("/explorer", {"sql": sql}), logger=logger, attempts=3)
    rows = data.get("rows") if isinstance(data, dict) else None
    if not isinstance(rows, list):
        raise RuntimeError("OpenDota did not return STRATZ candidate rows.")
    try:
        candidates = {
            int(row["match_id"]): int(row["start_time"])
            for row in rows[:candidate_limit]
        }
    except (KeyError, TypeError, ValueError):
        raise RuntimeError("OpenDota returned invalid STRATZ candidate rows.") from None
    candidates = {
        match_id: started for match_id, started in candidates.items()
        if match_id > 0 and start_epoch <= started < end_epoch
    }
    if not candidates:
        log_event(logger, "stratz_no_candidates", level=logging.WARNING)
        return []

    version = game_version_id(scope.patch, token)
    time.sleep(1)
    matches = fetch_matches(list(candidates), token)
    counts = aggregate_immortal_pairs(
        match for match in matches if match.get("gameVersionId") == version
    )
    ids_by_slug = {slug: hero_id for hero_id, slug in hero_map.items()}
    evidence = []
    window_start = _iso_from_epoch(min(candidates.values()))
    window_end = _iso_from_epoch(end_epoch)
    for row in relationships:
        source, target = row["sourceSlug"], row["targetSlug"]
        source_id, target_id = ids_by_slug[source], ids_by_slug[target]
        first, second = sorted((source_id, target_id))
        pair = counts.get((version, first, second))
        if pair is None:
            continue
        wins = pair.first_wins if source_id == first else pair.matches - pair.first_wins
        evidence.append({
            "id": f"stratz-immortal-{source}--{target}",
            "provider": "STRATZ",
            "sourceSlug": source,
            "targetSlug": target,
            "sourceWinRate": wins / pair.matches,
            "sampleSize": pair.matches,
            "scope": {
                "patch": scope.patch,
                "rankScope": "immortal",
                "matchPopulation": "ranked_all_draft_5v5",
                "observationWindowStart": window_start,
                "observationWindowEndExclusive": window_end,
            },
            "provenance": {
                "sourceUrl": "https://stratz.com/api",
                "queryScope": (
                    "recent OpenDota medal-75 sample; STRATZ ranked All Draft;"
                    f" rank=80; bracket=8; gameVersionId={version};"
                    f" {len(candidates)} candidates"
                ),
                "collectedAt": collected_at,
            },
        })
    log_event(
        logger, "stratz_evidence_complete",
        candidateCount=len(candidates), returnedMatchCount=len(matches),
        eligibleMatchCount=sum(pair.matches for pair in counts.values()) // 25,
        evidenceCount=len(evidence),
    )
    return evidence


def add_stratz_evidence(
    payload: dict[str, Any],
    hero_map: dict[int, str],
    *,
    end_epoch: int,
    collected_at: str,
    token: str,
    logger: logging.Logger,
) -> int:
    evidence = collect_stratz_evidence(
        payload["relationships"], hero_map, end_epoch=end_epoch,
        collected_at=collected_at, token=token, logger=logger,
    )
    replace_stratz_evidence(payload, evidence)
    return len(evidence)


def replace_stratz_evidence(
    payload: dict[str, Any], evidence: list[dict[str, Any]]
) -> None:
    observations = [
        row for row in payload.get("evidenceObservations", [])
        if row["provider"] != "STRATZ"
    ]
    observations.extend(evidence)
    payload["evidenceObservations"] = observations
    payload["coverage"]["immortalEvidenceCount"] = len(observations)


def previous_stratz_evidence(
    repo_root: Path, payload: dict[str, Any], end_epoch: int,
) -> list[dict[str, Any]]:
    try:
        previous = json.loads(
            (repo_root / "public" / "data" / "current-matchups.json").read_text(encoding="utf-8")
        )
    except (OSError, ValueError):
        return []
    if not isinstance(previous, dict) or previous.get("patch") != payload["patch"]:
        return []
    observations = previous.get("evidenceObservations", [])
    if not isinstance(observations, list):
        return []
    directions = {
        (row["sourceSlug"], row["targetSlug"]) for row in payload["relationships"]
    }
    retained = []
    cutoff = max(CURRENT_SCOPE.start_epoch, end_epoch - 36 * 60 * 60)
    for row in observations:
        if not isinstance(row, dict) or row.get("provider") != "STRATZ":
            continue
        if (row.get("sourceSlug"), row.get("targetSlug")) not in directions:
            continue
        try:
            scope = row["scope"]
            observed_end = datetime.fromisoformat(scope["observationWindowEndExclusive"])
            observed_epoch = observed_end.timestamp() if observed_end.tzinfo else 0
            if scope["patch"] == payload["patch"] and scope["rankScope"] == "immortal" and cutoff <= observed_epoch <= end_epoch:
                retained.append(row)
        except (KeyError, TypeError, ValueError):
            continue
    return retained


def generate(
    repo_root: Path,
    *,
    now: datetime | None = None,
    logger: logging.Logger,
    stratz_token: str = "",
) -> dict[str, Any]:
    generated_at = now or datetime.now(timezone.utc)
    end_epoch = generation_end_epoch(generated_at)
    if end_epoch <= CURRENT_SCOPE.start_epoch:
        raise RuntimeError("Current-patch observation window is empty")

    log_event(
        logger,
        "generation_start",
        patch=CURRENT_SCOPE.patch,
        windowStart=CURRENT_SCOPE.start_iso,
        windowEnd=_iso_from_epoch(end_epoch),
        rankScope=CURRENT_SCOPE.rank_scope,
        minimumSample=CURRENT_SCOPE.minimum_sample,
        layoutFallbackMinimumSample=CURRENT_SCOPE.layout_fallback_minimum_sample,
    )

    catalog_slugs = _load_catalog(repo_root)
    hero_map = _load_opendota_hero_map(repo_root, catalog_slugs)
    rows = _fetch_pair_rows(end_epoch, logger=logger)
    pairs = _normalize_pairs(rows, hero_map)
    immortal_pairs = _normalize_immortal_pairs(rows, hero_map)
    totals = hero_totals(pairs)
    ranked = rank_relationships(
        pairs,
        minimum_sample=CURRENT_SCOPE.minimum_sample,
    )
    layout_candidates = rank_relationships(
        pairs,
        minimum_sample=CURRENT_SCOPE.minimum_sample,
        confidence_z=0.0,
    )
    layout_relationships = _select_layout_relationships(layout_candidates)
    layout_fallback_candidates = rank_relationships(
        pairs,
        minimum_sample=CURRENT_SCOPE.layout_fallback_minimum_sample,
        confidence_z=0.0,
    )
    layout_relationships = _ensure_layout_neighbors(
        layout_relationships,
        layout_fallback_candidates,
        catalog_slugs,
    )
    weighted_edges = _layout_edges(layout_relationships)
    positions = compute_layout(catalog_slugs, weighted_edges)
    positions = spread_layout_positions(
        positions, max_nearest_distance=MAX_LAYOUT_NEAREST_DISTANCE
    )
    metrics = layout_metrics(positions, weighted_edges)

    qualifying_pair_count = sum(
        1 for pair in pairs if pair.matches >= CURRENT_SCOPE.minimum_sample
    )

    log_event(
        logger,
        "ranking_complete",
        rawPairCount=len(pairs),
        qualifyingPairCount=qualifying_pair_count,
        rankedRelationshipCount=len(ranked),
        layoutRelationshipCount=len(layout_relationships),
    )
    log_event(logger, "layout_complete", **metrics)

    hero_stats = {}
    for slug in sorted(catalog_slugs):
        total = totals.get(slug)
        if total is None or total.games <= 0:
            hero_stats[slug] = None
            continue
        if total.games % 5 != 0:
            raise RuntimeError(
                f"Hero {slug} pair-observation count is not divisible by five: "
                f"{total.games}"
            )
        hero_stats[slug] = {
            "overallWinRate": total.wins / total.games,
            "pairObservationGames": total.games,
            "matchCount": total.games // 5,
        }

    relationships = [
        {
            "sourceSlug": item.source,
            "targetSlug": item.target,
            "sourceWinRate": item.source_win_rate,
            "sampleSize": item.sample_size,
            "sourceBaseline": item.source_baseline,
            "targetBaseline": item.target_baseline,
            "expectedWinRate": item.expected_win_rate,
            "baselineAdjustedDelta": item.baseline_adjusted_delta,
            "standardError": item.standard_error,
            "rankingScore": item.ranking_score,
            "source": "OpenDota",
        }
        for item in ranked
    ]

    generated_at_iso = (
        generated_at.astimezone(timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )
    observation_end_iso = _iso_from_epoch(end_epoch)
    immortal_by_pair = {
        (pair.first_slug, pair.second_slug): pair for pair in immortal_pairs
    }
    evidence_observations: list[dict[str, Any]] = []

    for item in ranked:
        first_slug, second_slug = sorted((item.source, item.target))
        pair = immortal_by_pair.get((first_slug, second_slug))
        if pair is None or pair.matches <= 0:
            continue

        source_wins = (
            pair.first_wins
            if item.source == pair.first_slug
            else pair.matches - pair.first_wins
        )
        evidence_observations.append(
            {
                "id": f"opendota-immortal-{item.source}--{item.target}",
                "provider": "OpenDota",
                "sourceSlug": item.source,
                "targetSlug": item.target,
                "sourceWinRate": source_wins / pair.matches,
                "sampleSize": pair.matches,
                "scope": {
                    "patch": CURRENT_SCOPE.patch,
                    "rankScope": "immortal",
                    "matchPopulation": "ranked_all_draft_5v5",
                    "observationWindowStart": CURRENT_SCOPE.start_iso,
                    "observationWindowEndExclusive": observation_end_iso,
                },
                "provenance": {
                    "sourceUrl": "https://www.opendota.com/",
                    "queryScope": (
                        "public_matches:"
                        f"avg_rank_tier>={CURRENT_SCOPE.immortal_avg_rank_tier_min}:"
                        f"game_mode={CURRENT_SCOPE.game_mode}:"
                        f"lobby_type={CURRENT_SCOPE.lobby_type}"
                    ),
                    "collectedAt": generated_at_iso,
                },
            }
        )

    payload = {
        "schemaVersion": 2,
        "kind": "current-production-matchups",
        "patch": CURRENT_SCOPE.patch,
        "generatedAt": generated_at_iso,
        "scope": {
            "rankScope": CURRENT_SCOPE.rank_scope,
            "rankLabel": "Ancient+",
            "minimumSample": CURRENT_SCOPE.minimum_sample,
            "maxVisiblePerDirection": CURRENT_SCOPE.max_visible_per_direction,
            "openDotaAvgRankTierMin": CURRENT_SCOPE.avg_rank_tier_min,
            "gameMode": CURRENT_SCOPE.game_mode,
            "lobbyType": CURRENT_SCOPE.lobby_type,
            "observationWindowStart": CURRENT_SCOPE.start_iso,
            "observationWindowEndExclusive": observation_end_iso,
        },
        "provenance": {
            "headlineSource": "OpenDota",
            "endpoint": "/api/explorer",
            "sourceUrl": "https://www.opendota.com/",
            "queryMode": "public_matches",
            "secondarySources": [
                "STRATZ",
                "DOTABUFF",
                "Dota2ProTracker",
            ],
        },
        "method": {
            "ranking": "baseline-adjusted one-sided 95% lower confidence bound",
            "confidenceZ": 1.645,
            "expectedWinRate": "0.5 + (sourceBaseline - targetBaseline) / 2",
            "displayedStatistic": "raw source-hero matchup win rate",
        },
        "coverage": {
            "catalogHeroCount": len(catalog_slugs),
            "mappedHeroCount": len(hero_map),
            "rawPairCount": len(pairs),
            "qualifyingPairCount": qualifying_pair_count,
            "rankedRelationshipCount": len(ranked),
            "layoutRelationshipCount": len(layout_relationships),
            "immortalEvidenceCount": len(evidence_observations),
        },
        "layoutMetrics": metrics,
        "heroStats": hero_stats,
        "relationships": relationships,
        "evidenceObservations": evidence_observations,
        "positions": {
            slug: {"x": x, "y": y}
            for slug, (x, y) in sorted(positions.items())
        },
    }

    if stratz_token:
        try:
            add_stratz_evidence(
                payload, hero_map, end_epoch=end_epoch,
                collected_at=generated_at_iso, token=stratz_token, logger=logger,
            )
        except RuntimeError as exc:
            retained = previous_stratz_evidence(repo_root, payload, end_epoch)
            replace_stratz_evidence(payload, retained)
            log_event(
                logger, "stratz_evidence_unavailable", level=logging.WARNING,
                detail=str(exc), retainedEvidenceCount=len(retained),
            )

    if not payload["evidenceObservations"]:
        log_event(
            logger,
            "immortal_evidence_empty",
            level=logging.WARNING,
            reason=(
                "no_ranked_pair_overlap" if immortal_pairs else "no_immortal_pairs"
            ),
            immortalPairCount=len(immortal_pairs),
            rankedRelationshipCount=len(ranked),
            avgRankTierMin=CURRENT_SCOPE.immortal_avg_rank_tier_min,
            windowStart=CURRENT_SCOPE.start_iso,
            windowEnd=observation_end_iso,
        )

    log_event(
        logger,
        "generation_complete",
        patch=CURRENT_SCOPE.patch,
        relationshipCount=len(relationships),
        generatedAt=payload["generatedAt"],
    )
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate the current DotaGraph production matchup bundle"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/data/current-matchups.json"),
    )
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    logger = configure_logging(verbose=args.verbose)
    repo_root = Path(__file__).resolve().parents[2]
    output_path = args.output
    if not output_path.is_absolute():
        output_path = repo_root / output_path

    try:
        payload = generate(
            repo_root, logger=logger, stratz_token=os.getenv("STRATZ_API_TOKEN", "").strip(),
        )
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        log_event(
            logger,
            "output_written",
            path=str(output_path),
            bytes=output_path.stat().st_size,
        )
    except Exception:
        logger.exception("generation_failed")
        raise


if __name__ == "__main__":
    main()
