#!/bin/sh
# Automatically sync latest commit hash and timestamp into .tracker/state.json
# Install as .git/hooks/pre-commit (or call from an existing hook).
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
COMMIT=$(git rev-parse --short HEAD 2>/dev/null)

# tracker.py lives next to this script when copied into .git/hooks, or
# under plugin/srs-tracker/scripts when run in place from the repo.
if [ -f "$SCRIPT_DIR/tracker.py" ]; then
    TRACKER_PY="$SCRIPT_DIR/tracker.py"
elif [ -n "$REPO_ROOT" ] && [ -f "$REPO_ROOT/plugin/srs-tracker/scripts/tracker.py" ]; then
    TRACKER_PY="$REPO_ROOT/plugin/srs-tracker/scripts/tracker.py"
else
    exit 0
fi

if [ -n "$BRANCH" ] && [ -n "$COMMIT" ]; then
    python "$TRACKER_PY" sync-git --branch "$BRANCH" --commit "$COMMIT" || true
fi
