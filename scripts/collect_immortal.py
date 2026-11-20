"""Collect verified current-patch Immortal aggregates without publishing raw matches."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path

from dotagraph_pipeline.generate_current_bundle import (
    _load_catalog, _load_opendota_hero_map, add_stratz_evidence,
)
from dotagraph_pipeline.logging_utils import configure_logging


def main() -> None:
    root = Path.cwd()
    payload = json.loads((root / "public/data/current-matchups.json").read_text())
    end = int(datetime.fromisoformat(payload["scope"]["observationWindowEndExclusive"]).timestamp())
    hero_map = _load_opendota_hero_map(root, _load_catalog(root))
    logger = configure_logging()
    token = os.environ.get("STRATZ_API_TOKEN", "").strip()
    if not token:
        raise RuntimeError("STRATZ_API_TOKEN is missing.")
    for _ in range(4):
        count = add_stratz_evidence(
            payload, hero_map, end_epoch=end,
            collected_at=datetime.now(timezone.utc).isoformat(), token=token, logger=logger,
        )
        history = payload.get("stratzImmortalHistory", {})
        print(json.dumps({
            "patch": payload["patch"], "matchCount": history.get("matchCount", 0),
            "candidateCount": history.get("candidateCount", 0),
            "evidenceCount": count, "backlogSeconds": history.get("backlogSeconds", 0),
        }), flush=True)
        if history.get("backlogSeconds", 0) == 0:
            break
    if not payload.get("stratzImmortalHistory", {}).get("matchCount"):
        raise RuntimeError("No verified Immortal matches were collected.")
    target = root / "artifacts/immortal/current-matchups.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
