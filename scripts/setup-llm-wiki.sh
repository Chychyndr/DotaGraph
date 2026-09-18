#!/usr/bin/env bash
set -euo pipefail

HUB_ARG=""
FORCE_SESSION_CONFIG=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --hub)
      HUB_ARG="${2:?--hub requires a path}"
      shift 2
      ;;
    --force-session-config)
      FORCE_SESSION_CONFIG=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

command -v codex >/dev/null 2>&1 || { echo "Codex CLI was not found in PATH." >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || {
  echo "python3 is required by the llm-wiki Codex hooks." >&2
  echo "On macOS with Homebrew: brew install python" >&2
  exit 1
}

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE_CONFIG="$REPO_ROOT/config/llm-wiki-session.json"

echo "Installing/updating llm-wiki Codex plugin..."
if ! codex plugin marketplace add nvk/llm-wiki; then
  echo "Marketplace already exists or add failed; trying upgrade..."
  codex plugin marketplace upgrade llm-wiki
fi
codex plugin add wiki@llm-wiki

HOME_DIR="${HOME:?HOME is not set}"
CONFIG_DIR="$HOME_DIR/.config/llm-wiki"
CONFIG_PATH="$CONFIG_DIR/config.json"
mkdir -p "$CONFIG_DIR"

expand_hub() {
  local value="$1"
  if [[ "$value" == "~" ]]; then
    printf '%s\n' "$HOME_DIR"
  elif [[ "$value" == "~/"* ]]; then
    printf '%s/%s\n' "$HOME_DIR" "${value#~/}"
  else
    printf '%s\n' "$value"
  fi
}

if [[ -n "$HUB_ARG" ]]; then
  HUB_PATH="$(expand_hub "$HUB_ARG")"
  python3 - "$CONFIG_PATH" "$HUB_ARG" <<'PY'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1])
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps({"hub_path": sys.argv[2]}, indent=2) + "\n", encoding="utf-8")
PY
elif [[ -f "$CONFIG_PATH" ]]; then
  CONFIGURED="$(python3 - "$CONFIG_PATH" <<'PY'
import json, pathlib, sys
data = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
print(data.get("hub_path") or data.get("resolved_path") or "")
PY
)"
  if [[ -n "$CONFIGURED" ]]; then
    HUB_PATH="$(expand_hub "$CONFIGURED")"
  else
    HUB_PATH="$HOME_DIR/wiki"
  fi
else
  HUB_ARG="~/wiki"
  HUB_PATH="$HOME_DIR/wiki"
  python3 - "$CONFIG_PATH" <<'PY'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1])
path.write_text(json.dumps({"hub_path": "~/wiki"}, indent=2) + "\n", encoding="utf-8")
PY
fi

mkdir -p "$HUB_PATH/topics" "$HUB_PATH/.sessions"

if [[ ! -f "$HUB_PATH/wikis.json" ]]; then
  cat > "$HUB_PATH/wikis.json" <<'JSON'
{
  "default": "<HUB>",
  "wikis": {
    "hub": {
      "path": "<HUB>",
      "description": "Global llm-wiki hub"
    }
  },
  "local_wikis": []
}
JSON
fi

if [[ ! -f "$HUB_PATH/_index.md" ]]; then
  cat > "$HUB_PATH/_index.md" <<'MD'
# Wiki Hub

> Global llm-wiki hub. Session memory lives under .sessions/; durable topic knowledge lives under topics/.

## Topic Wikis

| Topic | Description | Status |
|------|-------------|--------|

## Notes

DotaGraph code, tests, ADRs, issues, and living docs remain canonical project truth. Session digests are operational context.
MD
fi

if [[ ! -f "$HUB_PATH/log.md" ]]; then
  printf '# Wiki Activity Log\n' > "$HUB_PATH/log.md"
fi

SESSION_CONFIG="$HUB_PATH/.sessions/config.json"
if [[ "$FORCE_SESSION_CONFIG" -eq 1 || ! -f "$SESSION_CONFIG" ]]; then
  cp "$TEMPLATE_CONFIG" "$SESSION_CONFIG"
  echo "Applied DotaGraph session profile: $SESSION_CONFIG"
else
  echo "Existing session config preserved: $SESSION_CONFIG"
  echo "Run again with --force-session-config to apply the repository profile."
fi

cat <<EOF2

llm-wiki setup complete.
Hub: $HUB_PATH

Required one-time UI step:
  1. Restart Codex.
  2. Open /hooks.
  3. Review and trust the llm-wiki hooks.

Then open DotaGraph from this repository directory.
New Codex threads will receive the latest distilled session context on SessionStart.
Use \$wiki-query for small read-only lookups, and @wiki for full session/wiki workflows.
EOF2
