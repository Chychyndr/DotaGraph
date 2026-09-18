#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import shutil
import subprocess
from pathlib import Path


def home_dir() -> Path:
    return Path(os.environ.get("HOME") or Path.home())


def expand_portable(value: str, home: Path) -> Path:
    if value == "~":
        return home
    if value.startswith("~/"):
        return home / value[2:]
    return Path(value)


def write_if_missing(path: Path, text: str) -> None:
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def git_value(repo: Path, *args: str) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(repo), *args],
            check=False,
            capture_output=True,
            text=True,
            timeout=3,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return result.stdout.strip() if result.returncode == 0 else ""


def resolve_hub(requested: str | None, home: Path) -> tuple[Path, str]:
    config_dir = home / ".config" / "llm-wiki"
    config_path = config_dir / "config.json"
    config_dir.mkdir(parents=True, exist_ok=True)

    if requested:
        portable = requested
        config_path.write_text(json.dumps({"hub_path": portable}, indent=2) + "\n", encoding="utf-8")
        return expand_portable(portable, home), portable

    if config_path.exists():
        data = json.loads(config_path.read_text(encoding="utf-8"))
        portable = str(data.get("hub_path") or data.get("resolved_path") or "")
        if portable:
            return expand_portable(portable, home), portable

    portable = "~/wiki"
    config_path.write_text(json.dumps({"hub_path": portable}, indent=2) + "\n", encoding="utf-8")
    return home / "wiki", portable


def init_hub(hub: Path) -> None:
    (hub / "topics").mkdir(parents=True, exist_ok=True)
    (hub / ".sessions").mkdir(parents=True, exist_ok=True)

    write_if_missing(
        hub / "wikis.json",
        json.dumps(
            {
                "default": "<HUB>",
                "wikis": {"hub": {"path": "<HUB>", "description": "Global llm-wiki hub"}},
                "local_wikis": [],
            },
            indent=2,
        )
        + "\n",
    )
    write_if_missing(
        hub / "_index.md",
        """# Wiki Hub

> Global llm-wiki hub. Session memory lives under .sessions/; durable topic knowledge lives under topics/.

## Topic Wikis

| Topic | Description | Status |
|------|-------------|--------|

## Notes

DotaGraph code, tests, ADRs, issues, and living docs remain canonical project truth. Session digests are operational context.
""",
    )
    write_if_missing(hub / "log.md", "# Wiki Activity Log\n")


def apply_session_profile(repo: Path, hub: Path, force: bool) -> Path:
    source = repo / "config" / "llm-wiki-session.json"
    destination = hub / ".sessions" / "config.json"
    if force or not destination.exists():
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        print(f"Applied DotaGraph session profile: {destination}")
    else:
        print(f"Existing session config preserved: {destination}")
        print("Use --force-session-config to replace it with the DotaGraph profile.")
    return destination


def seed_bootstrap(repo: Path, hub: Path) -> None:
    state_path = hub / ".sessions" / "state" / "manual" / "dotagraph-bootstrap.json"
    if state_path.exists():
        return

    now = dt.datetime.now(dt.UTC).replace(microsecond=0)
    now_iso = now.isoformat().replace("+00:00", "Z")
    digest_path = (
        hub
        / ".sessions"
        / "digests"
        / f"{now.year:04d}"
        / f"{now.month:02d}"
        / "manual-dotagraph-bootstrap.md"
    )
    digest_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.parent.mkdir(parents=True, exist_ok=True)

    template = (repo / "config" / "llm-wiki-dotagraph-bootstrap.md").read_text(encoding="utf-8")
    digest = (
        template.replace("{{CWD}}", str(repo))
        .replace("{{NOW}}", now_iso)
        .replace("{{GIT_REMOTE}}", git_value(repo, "config", "--get", "remote.origin.url"))
        .replace("{{GIT_BRANCH}}", git_value(repo, "branch", "--show-current"))
    )
    digest_path.write_text(digest, encoding="utf-8")

    state = {
        "schema_version": 1,
        "harness": "manual",
        "native_session_id": "dotagraph-bootstrap",
        "llm_wiki_session_id": "manual:dotagraph-bootstrap",
        "started_at": now_iso,
        "last_seen_at": now_iso,
        "cwd": str(repo),
        "transcript_path": None,
        "model": None,
        "privacy": "redacted",
        "raw_transcripts": False,
        "git_remote": git_value(repo, "config", "--get", "remote.origin.url"),
        "git_branch": git_value(repo, "branch", "--show-current"),
        "event_count": 1,
        "tool_event_count": 0,
        "topics": ["dotagraph"],
        "last_events": [],
        "last_digest_path": str(digest_path),
        "last_digest_at": now_iso,
        "last_digest_trigger": "bootstrap",
        "promoted_to": [],
    }
    state_path.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    print(f"Seeded pre-llm-wiki DotaGraph context: {digest_path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Configure llm-wiki session memory for DotaGraph.")
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--hub", default=None, help="Portable hub path, e.g. ~/wiki")
    parser.add_argument("--force-session-config", action="store_true")
    args = parser.parse_args()

    repo = args.repo.resolve()
    home = home_dir()
    hub, portable = resolve_hub(args.hub, home)
    hub = hub.expanduser().resolve()
    init_hub(hub)
    apply_session_profile(repo, hub, args.force_session_config)
    seed_bootstrap(repo, hub)

    print(f"Hub: {hub}")
    print(f"Configured as: {portable}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
