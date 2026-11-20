"""Collect verified current-patch Immortal aggregates without publishing raw matches."""
import argparse
from datetime import datetime, timezone
import json
import os
import tempfile
from pathlib import Path

from dotagraph_pipeline.generate_current_bundle import (
    _load_catalog, _load_opendota_hero_map, add_stratz_evidence,
)
from dotagraph_pipeline.logging_utils import configure_logging
from dotagraph_pipeline.config import CURRENT_SCOPE


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("public/data/current-matchups.json"))
    parser.add_argument("--output", type=Path, default=Path("artifacts/immortal/current-matchups.json"))
    args = parser.parse_args()
    root = Path.cwd()
    source = args.input if args.input.is_absolute() else root / args.input
    target = args.output if args.output.is_absolute() else root / args.output
    payload = json.loads(source.read_text())
    if payload.get("patch") != CURRENT_SCOPE.patch:
        raise RuntimeError("Input snapshot does not match the configured current patch.")
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
        if history.get("matchCount"):
            # Preserve completed intervals even if a later provider request fails.
            target.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=target.parent, delete=False) as checkpoint:
                json.dump(payload, checkpoint, ensure_ascii=False, indent=2)
                checkpoint.write("\n")
                checkpoint_path = checkpoint.name
            os.replace(checkpoint_path, target)
        if history.get("backlogSeconds", 0) == 0:
            break
    if not payload.get("stratzImmortalHistory", {}).get("matchCount"):
        raise RuntimeError("No verified Immortal matches were collected.")


if __name__ == "__main__":
    main()
