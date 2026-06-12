#!/bin/bash
# Render deploy status checker.
#
# Usage:   RENDER_API_KEY=rnd_xxx ./scripts/render-status.sh [n]
#          (n = number of recent deploys to show, default 5)
#
# Get a key: Render Dashboard → Account Settings → API Keys → Create API Key.
# Optionally set RENDER_SERVICE_ID (srv-...) to skip the service lookup.

set -euo pipefail

if [ -z "${RENDER_API_KEY:-}" ]; then
  echo "❌ RENDER_API_KEY is not set."
  echo "   Create one: https://dashboard.render.com → Account Settings → API Keys"
  exit 1
fi

LIMIT="${1:-5}"
AUTH=(-H "Authorization: Bearer $RENDER_API_KEY" -H "Accept: application/json")

SERVICE_ID="${RENDER_SERVICE_ID:-srv-d8e3g7jbc2fs73c7la50}"
if [ -z "$SERVICE_ID" ]; then
  SERVICE_ID=$(curl -sf "${AUTH[@]}" "https://api.render.com/v1/services?name=techieride-webapp-v2&limit=5" \
    | jq -r '.[0].service.id // empty')
  if [ -z "$SERVICE_ID" ]; then
    # Fall back to listing everything so the user can see what exists
    echo "⚠️  Service 'techieride-webapp-v2' not found by name. Available services:"
    curl -sf "${AUTH[@]}" "https://api.render.com/v1/services?limit=20" \
      | jq -r '.[].service | "  \(.id)  \(.name)  (\(.type))"'
    echo "Set RENDER_SERVICE_ID=srv-... and re-run."
    exit 1
  fi
fi

echo "📡 Service: $SERVICE_ID"
echo "─────────────────────────────────────────────────────────────"

curl -sf "${AUTH[@]}" "https://api.render.com/v1/services/$SERVICE_ID/deploys?limit=$LIMIT" \
  | jq -r '.[].deploy |
      "\(.status | if . == "live" then "✅" elif (test("failed|canceled|deactivated")) then "❌" else "⏳" end) \(.status)\t\(.commit.id[:7])\t\(.createdAt)\t\(.commit.message | split("\n")[0] | .[:60])"' \
  | column -t -s $'\t'

echo "─────────────────────────────────────────────────────────────"
echo "Local HEAD: $(git rev-parse --short HEAD)  origin/main: $(git rev-parse --short origin/main 2>/dev/null || echo '?')"
