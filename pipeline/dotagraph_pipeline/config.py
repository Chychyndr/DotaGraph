from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class PatchScope:
    patch: str
    start_iso: str
    start_epoch: int
    rank_scope: str = "ancient_plus"
    avg_rank_tier_min: int = 60
    immortal_avg_rank_tier_min: int = 80
    game_mode: int = 22
    lobby_type: int = 7
    minimum_sample: int = 500
    layout_fallback_minimum_sample: int = 100
    max_visible_per_direction: int = 5


# OpenDota dotaconstants patch 61: 2026-11-18T21:28:07.019Z.
# Match start_time is integer seconds; round up to exclude pre-patch matches.
# https://github.com/odota/dotaconstants/blob/master/build/patch.json
CURRENT_SCOPE = PatchScope(
    patch="7.42",
    start_iso="2026-11-18T21:28:08Z",
    start_epoch=1795037288,
)


def generation_end_epoch(now: datetime | None = None) -> int:
    current = now or datetime.now(timezone.utc)
    return int(current.timestamp())


def generation_end_iso(now: datetime | None = None) -> str:
    current = now or datetime.now(timezone.utc)
    return current.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
