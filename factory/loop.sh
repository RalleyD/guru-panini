#!/usr/bin/env bash
# Run the factory through the backlog with no human in the loop.
#
#   factory/loop.sh [max-items]
#
# Each backlog item runs in its own fresh `claude -p "/factory loop --one"`
# session, so the context is reset after every item. Job state lives on disk
# (factory/jobs/, git, factory/loop/), so nothing is lost between sessions.
# Stops when the backlog is empty, after max-items, or when an item fails.
#
# FACTORY_CLAUDE_FLAGS sets the claude flags (default: --permission-mode acceptEdits).
# An unattended run must not stop at a permission prompt: allow the tools the
# factory uses (Bash, Agent, SendMessage, file tools) in .claude/settings.json or
# here, in a sandbox you are happy to let run.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
max=${1:-0}
read -r -a flags <<<"${FACTORY_CLAUDE_FLAGS:---permission-mode acceptEdits}"
state=factory/loop/state.json

mkdir -p factory/loop
mkdir factory/loop/lock 2>/dev/null || {
  echo "Another loop holds factory/loop/lock. If none is running, remove that folder." >&2
  exit 1
}
trap 'rmdir factory/loop/lock' EXIT

field() { python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get(sys.argv[2], ""))' "$state" "$1"; }

n=0
while grep -q '^- \[ \]' factory/backlog.md; do
  if [ "$max" -gt 0 ] && [ "$n" -ge "$max" ]; then
    echo "Reached $max items."
    break
  fi
  rm -f "$state"
  echo "== item $((n + 1)) =="
  claude -p "/factory loop --one" "${flags[@]}" || echo "claude exited with status $?" >&2

  if [ ! -f "$state" ]; then
    echo "Stopped: the session ended without writing $state." >&2
    exit 1
  fi
  case "$(field status)" in
  continue) n=$((n + 1)) ;;
  done) break ;;
  *)
    echo "Stopped at $(field job): $(field reason)" >&2
    exit 1
    ;;
  esac
done

echo "Merged $n items. Ledger: factory/loop/ledger.md"
