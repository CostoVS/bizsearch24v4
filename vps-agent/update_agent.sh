#!/usr/bin/env bash
# =============================================================================
# Quick Update Script for Hermes Agent on VPS
# =============================================================================
set -e

APP_DIR="/opt/hermes-searchbiz"
mkdir -p "${APP_DIR}"

echo "Updating /opt/hermes-searchbiz/hermes_searchbiz_agent.py..."
cp hermes_searchbiz_agent.py "${APP_DIR}/hermes_searchbiz_agent.py"
chmod +x "${APP_DIR}/hermes_searchbiz_agent.py"

echo "Restarting hermes-agent service..."
systemctl daemon-reload
systemctl restart hermes-agent

echo "✅ Hermes Agent updated and running!"
systemctl status hermes-agent --no-pager
