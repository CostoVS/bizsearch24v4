#!/usr/bin/env bash
# =============================================================================
# SearchBiz 2M+ Scraped Listings -> Live Website Ads Push Script
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Syncing latest code to /opt/hermes-searchbiz..."
mkdir -p /opt/hermes-searchbiz
cp -f "$SCRIPT_DIR/hermes_searchbiz_agent.py" /opt/hermes-searchbiz/hermes_searchbiz_agent.py 2>/dev/null || true

echo "🧹 Freeing temporary files and duplicate backups before streaming 2M+ ads..."
bash "$SCRIPT_DIR/clean_vps.sh" || true

echo "⚡ Streaming all 2,169,668+ scraped listings (from 313 CSVs, listings/, leads_storage/ & SQLite) directly into SearchBiz.co.za..."
if [ -x "/opt/hermes-searchbiz/venv/bin/python" ]; then
    /opt/hermes-searchbiz/venv/bin/python "$SCRIPT_DIR/hermes_searchbiz_agent.py" --push-ads
else
    python3 "$SCRIPT_DIR/hermes_searchbiz_agent.py" --push-ads
fi

echo "✅ All scraped listings are now pushed to SearchBiz.co.za as ads!"
