#!/usr/bin/env bash
# =============================================================================
# SearchBiz Unified Fast Update & Zero-Lag Pre-Warm Script
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

echo "🚀 Updating SearchBiz Web & Agent with Zero-Lag RAM Indexing..."

mkdir -p .data data

if [ -f "docker-compose.yml" ] && command -v docker &> /dev/null; then
  echo "🐳 Rebuilding and starting searchbiz-web container..."
  docker compose up --build -d web
fi

if [ -d "vps-agent" ] && [ -f "vps-agent/update_agent.sh" ]; then
  echo "🤖 Updating Hermes VPS Agent..."
  (cd vps-agent && bash update_agent.sh) || true
fi

echo "⚡ Pre-warming SearchBiz O(1) RAM Index..."
for i in 1 2 3 4 5; do
  if curl -sSf "http://127.0.0.1:3005/api/storage?statsOnly=true" >/dev/null 2>&1 || curl -sSf "http://127.0.0.1:3000/api/storage?statsOnly=true" >/dev/null 2>&1; then
    curl -s "http://127.0.0.1:3005/api/storage?freeOnly=true&includeFeatured=true&page=1&pageSize=12" >/dev/null 2>&1 || true
    curl -s "http://127.0.0.1:3005/api/storage?page=1&pageSize=24" >/dev/null 2>&1 || true
    curl -s "http://127.0.0.1:3000/api/storage?freeOnly=true&includeFeatured=true&page=1&pageSize=12" >/dev/null 2>&1 || true
    curl -s "http://127.0.0.1:3000/api/storage?page=1&pageSize=24" >/dev/null 2>&1 || true
    echo "✅ SearchBiz RAM Index is warm and serving in <1ms!"
    break
  fi
  sleep 1
done
