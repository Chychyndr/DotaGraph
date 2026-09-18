#!/usr/bin/env bash
set -euo pipefail

HUB_ARG=""
FORCE_SESSION_CONFIG=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --hub) HUB_ARG="${2:?--hub requires a path}"; shift 2 ;;
    --force-session-config) FORCE_SESSION_CONFIG=1; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

command -v codex >/dev/null 2>&1 || { echo "Codex CLI was not found in PATH." >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || {
  echo "python3 is required by the llm-wiki Codex hooks." >&2
  echo "On macOS with Homebrew: brew install python" >&2
  exit 1
}

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Installing/updating llm-wiki Codex plugin..."
if ! codex plugin marketplace add nvk/llm-wiki; then
  echo "Marketplace already exists or add failed; trying upgrade..."
  codex plugin marketplace upgrade llm-wiki
fi
codex plugin add wiki@llm-wiki

ARGS=("$REPO_ROOT/scripts/configure-llm-wiki.py" --repo "$REPO_ROOT")
[[ -n "$HUB_ARG" ]] && ARGS+=(--hub "$HUB_ARG")
[[ "$FORCE_SESSION_CONFIG" -eq 1 ]] && ARGS+=(--force-session-config)
python3 "${ARGS[@]}"

cat <<'EOF2'

Required one-time UI step:
  1. Restart Codex.
  2. Open /hooks.
  3. Review and trust the llm-wiki hooks.

New Codex threads opened from this DotaGraph checkout will receive distilled session context on SessionStart.
Use $wiki-query for small read-only lookups, and @wiki for full session/wiki workflows.
EOF2
