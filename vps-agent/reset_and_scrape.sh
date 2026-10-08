#!/usr/bin/env bash
# =============================================================================
# SearchBiz Full Reset + Fresh 313-Category Scrape & Live Website Upload Script
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🛑 Stopping background Hermes service during reset..."
systemctl stop hermes-agent.service 2>/dev/null || true

echo "🚀 Syncing latest code to /opt/hermes-searchbiz..."
mkdir -p /opt/hermes-searchbiz
cp -f "$SCRIPT_DIR/hermes_searchbiz_agent.py" /opt/hermes-searchbiz/hermes_searchbiz_agent.py 2>/dev/null || true
cp -f "$SCRIPT_DIR/hermes_laya_permanent_memory.json" /opt/hermes-searchbiz/hermes_laya_permanent_memory.json 2>/dev/null || true

echo "🗑️ Wiping all old scraped listings across /opt/hermes-searchbiz, /home/thehightable/bizsearch24v4, SQLite & SearchBiz db.json..."
if [ -x "/opt/hermes-searchbiz/venv/bin/python" ]; then
    /opt/hermes-searchbiz/venv/bin/python -u "$SCRIPT_DIR/hermes_searchbiz_agent.py" --reset-all
else
    python3 -u "$SCRIPT_DIR/hermes_searchbiz_agent.py" --reset-all
fi

echo "🔄 Restarting Hermes background service..."
systemctl start hermes-agent.service 2>/dev/null || true

echo "⚡ Launching fresh 313-Category x 9-Province x 6,931-Suburb Harvest with Live Upload to SearchBiz.co.za..."
if [ -x "/opt/hermes-searchbiz/venv/bin/python" ]; then
    /opt/hermes-searchbiz/venv/bin/python -u "$SCRIPT_DIR/hermes_searchbiz_agent.py" --scrape-all-313 --workers 16
else
    python3 -u "$SCRIPT_DIR/hermes_searchbiz_agent.py" --scrape-all-313 --workers 16
fi

echo "✅ Fresh scrape and SearchBiz.co.za live upload complete!"
