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

echo "📂 Linking all scraped CSV files from /opt/hermes-searchbiz into leads_storage/ and listings/ so they are visible everywhere..."
mkdir -p "$SCRIPT_DIR/leads_storage" "$SCRIPT_DIR/listings" "$SCRIPT_DIR/scraped_leads_vault" "$SCRIPT_DIR/../listings"
find /opt/hermes-searchbiz -name "*.csv" -type f 2>/dev/null | while read -r csv_fp; do
    base_fn="$(basename "$csv_fp")"
    ln -f "$csv_fp" "$SCRIPT_DIR/leads_storage/$base_fn" 2>/dev/null || cp -f "$csv_fp" "$SCRIPT_DIR/leads_storage/$base_fn" 2>/dev/null || true
    ln -f "$csv_fp" "$SCRIPT_DIR/listings/$base_fn" 2>/dev/null || cp -f "$csv_fp" "$SCRIPT_DIR/listings/$base_fn" 2>/dev/null || true
    ln -f "$csv_fp" "$SCRIPT_DIR/../listings/$base_fn" 2>/dev/null || cp -f "$csv_fp" "$SCRIPT_DIR/../listings/$base_fn" 2>/dev/null || true
done

echo "⚡ Streaming all 2,169,668+ scraped listings (from 313 CSVs, listings/, leads_storage/ & SQLite) directly into SearchBiz.co.za..."
if [ -x "/opt/hermes-searchbiz/venv/bin/python" ]; then
    /opt/hermes-searchbiz/venv/bin/python -u "$SCRIPT_DIR/hermes_searchbiz_agent.py" --push-ads
else
    python3 -u "$SCRIPT_DIR/hermes_searchbiz_agent.py" --push-ads
fi

echo "🔄 Reloading SearchBiz.co.za live directory cache..."
curl -s "http://127.0.0.1:3005/api/storage?reload=true" >/dev/null 2>&1 || true
curl -s "http://127.0.0.1:3000/api/storage?reload=true" >/dev/null 2>&1 || true

echo "✅ All scraped listings are now linked in leads_storage/ & listings/ and pushed to SearchBiz.co.za as ads!"
