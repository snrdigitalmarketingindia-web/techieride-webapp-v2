#!/bin/bash
# Translate between build numbers and commits (version = 2.1.0.{commit count}).
#
#   ./scripts/version-lookup.sh 797          → commit for build 797
#   ./scripts/version-lookup.sh 099e071      → build number for that commit
#   ./scripts/version-lookup.sh              → last 10 builds
set -euo pipefail
cd "$(dirname "$0")/.."

if [ $# -eq 0 ]; then
  echo "Recent builds:"
  git log --oneline -10 --format="%h %s" | while read -r sha rest; do
    n=$(git rev-list --count "$sha")
    echo "  2.1.0.$n  $sha  $rest"
  done
  exit 0
fi

ARG="$1"
if [[ "$ARG" =~ ^[0-9]+$ ]] || [[ "$ARG" =~ ^2\.1\.0\.([0-9]+)$ ]]; then
  N="${BASH_REMATCH[1]:-$ARG}"
  SHA=$(git rev-list --reverse HEAD | sed -n "${N}p")
  if [ -z "$SHA" ]; then echo "No commit #$N (repo has $(git rev-list --count HEAD) commits)"; exit 1; fi
  echo "2.1.0.$N = $(git log --oneline -1 "$SHA")"
else
  N=$(git rev-list --count "$ARG")
  echo "$(git log --oneline -1 "$ARG") = 2.1.0.$N"
fi
