#!/usr/bin/env bash
# Run the factory through the backlog with no human in the loop.
#
#   factory/loop.sh [--wave N] [max-items]
#
# --wave N only takes items under the "## Wave N" heading of factory/backlog.md
# and stops when that group has no unchecked item left.
#
# Each backlog item runs in its own fresh `claude -p "/factory loop --one"`
# session, so the context is reset after every item. Job state lives on disk
# (factory/jobs/, git, factory/loop/), so nothing is lost between sessions.
# Stops when there is no item left, after max-items, or when an item fails.
#
# FACTORY_CLAUDE_FLAGS sets the claude flags (default: --permission-mode acceptEdits).
# An unattended run must not stop at a permission prompt: allow the tools the
# factory uses (Bash, Agent, SendMessage, file tools) in .claude/settings.json or
# here, in a sandbox you are happy to let run.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
wave=""
max=0
while [ $# -gt 0 ]; do
  case "$1" in
  --wave)
    [[ "${2:-}" =~ ^[0-9]+$ ]] || { echo "--wave needs a number" >&2; exit 2; }
    wave=$2
    shift 2
    ;;
  *[!0-9]* | "") echo "usage: factory/loop.sh [--wave N] [max-items]" >&2; exit 2 ;;
  *)
    max=$1
    shift
    ;;
  esac
done
read -r -a flags <<<"${FACTORY_CLAUDE_FLAGS:---permission-mode acceptEdits}"
state=factory/loop/state.json
backlog=factory/backlog.md

# Unchecked items in scope: the whole backlog, or the "## Wave N" section only.
open_items() {
  awk -v wave="$wave" '
    /^## / { in_wave = (wave == "" || $0 ~ ("^## Wave " wave "([^0-9]|$)")) }
    in_wave && /^- \[ \]/ { print; found = 1 }
    END { exit !found }
  ' "$backlog" || true
}

if [ -n "$wave" ] && ! grep -qE "^## Wave $wave([^0-9]|$)" "$backlog"; then
  echo "No '## Wave $wave' heading in $backlog." >&2
  exit 2
fi

mkdir -p factory/loop
mkdir factory/loop/lock 2>/dev/null || {
  echo "Another loop holds factory/loop/lock. If none is running, remove that folder." >&2
  exit 1
}
trap 'rmdir factory/loop/lock' EXIT

field() { python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get(sys.argv[2], ""))' "$state" "$1"; }

n=0
while [ -n "$(open_items)" ]; do
  if [ "$max" -gt 0 ] && [ "$n" -ge "$max" ]; then
    echo "Reached $max items."
    break
  fi
  before=$(open_items | wc -l)
  rm -f "$state"
  echo "== item $((n + 1)) =="
  claude -p "/factory loop --one${wave:+ --wave $wave}" "${flags[@]}" || echo "claude exited with status $?" >&2

  if [ ! -f "$state" ]; then
    echo "Stopped: the session ended without writing $state." >&2
    exit 1
  fi
  case "$(field status)" in
  continue)
    if [ "$(open_items | wc -l)" -ge "$before" ]; then
      echo "Stopped: the session reported success but no backlog item was claimed." >&2
      exit 1
    fi
    n=$((n + 1))
    ;;
  done) break ;;
  *)
    echo "Stopped at $(field job): $(field reason)" >&2
    exit 1
    ;;
  esac
done

echo "Merged $n items. Ledger: factory/loop/ledger.md"
