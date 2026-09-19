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
    game_mode: int = 22
    lobby_type: int = 7
    minimum_sample: int = 500
    max_visible_per_direction: int = 5


CURRENT_SCOPE = PatchScope(
    patch="7.41f",
    start_iso="2026-09-16T00:00:00Z",
    start_epoch=1789516800,
)


def generation_end_epoch(now: datetime | None = None) -> int:
    current = now or datetime.now(timezone.utc)
    return int(current.timestamp())


def generation_end_iso(now: datetime | None = None) -> str:
    current = now or datetime.now(timezone.utc)
    return current.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
