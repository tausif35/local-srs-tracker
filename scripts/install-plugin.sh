#!/usr/bin/env bash
# Universal SRS Tracker Multi-Agent Plugin Installer (Linux / macOS)
# Thin wrapper -- all install logic lives in install-plugin.py so
# Windows/Linux/macOS share one source of truth instead of two drifting copies.
set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

PY=$(command -v python3 || command -v python || true)
if [ -z "$PY" ]; then
    echo "Error: python3 (or python) not found on PATH. Install Python 3 first." >&2
    exit 1
fi

exec "$PY" "$SCRIPT_DIR/install-plugin.py" "$@"
