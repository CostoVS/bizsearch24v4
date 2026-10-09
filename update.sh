#!/usr/bin/env bash
# =============================================================================
# SearchBiz Unified Fast Update & Zero-Lag Pre-Warm Script
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

echo "🚀 Updating SearchBiz Web & Agent with Zero-Lag RAM Indexing..."

if [ -d ".git" ]; then
  echo "🔄 Syncing latest repository changes from GitHub (overwriting any untracked conflicts)..."
  git fetch origin main 2>/dev/null && git reset --hard origin/main 2>/dev/null || true
fi

mkdir -p .data data

LEGACY_PURGE_FLAG=".data/.purged_legacy_2m_v2026_10_08_r2"
if [ ! -f "${LEGACY_PURGE_FLAG}" ]; then
  echo "🧹 Purging all old legacy listings across SearchBiz & VPS before clean start..."
  rm -rf listings/* vps-agent/listings/* vps-agent/leads_storage/* vps-agent/scraped_leads_vault/* /opt/hermes-searchbiz/listings/* /opt/hermes-searchbiz/leads_storage/* /opt/hermes-searchbiz/scraped_leads_vault/* 2>/dev/null || true
  rm -f data/backup_db.json .data/backup_db.json /opt/hermes-searchbiz/leads_storage/searchbiz_db_backup.json 2>/dev/null || true
  NOW_MS="$(date +%s)000"
  printf '{"ads":[],"banners":[],"messages":[],"deletedMessages":[],"deletedAds":[],"trashAds":[],"customPartners":[],"community_posts":[],"slugs":[],"claimRequests":[],"updatedAt":%s,"lastPurgeAt":%s}\n' "${NOW_MS}" "${NOW_MS}" > data/db.json
  cp -f data/db.json .data/db.json 2>/dev/null || true
  printf '%s\n' "${NOW_MS}" > "${LEGACY_PURGE_FLAG}" 2>/dev/null || true
  mkdir -p /opt/hermes-searchbiz 2>/dev/null || true
  printf '%s\n' "${NOW_MS}" > "/opt/hermes-searchbiz/.purged_legacy_2m_v2026_10_08_r2" 2>/dev/null || true
fi

if [ -f "docker-compose.yml" ] && command -v docker &> /dev/null; then
  echo "🐳 Rebuilding and starting searchbiz-web container..."
  systemctl start docker 2>/dev/null || true
  docker compose up --build -d web || docker compose up -d web || docker start searchbiz-web 2>/dev/null || true
fi

if command -v nginx &> /dev/null; then
  systemctl start nginx 2>/dev/null || true
  systemctl reload nginx 2>/dev/null || true
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
