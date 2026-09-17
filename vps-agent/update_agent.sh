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

# Ensure .env has active ai@searchbiz.co.za credentials
if [ -f "${APP_DIR}/.env" ]; then
    sed -i '/SMTP_/d' "${APP_DIR}/.env"
    sed -i '/IMAP_/d' "${APP_DIR}/.env"
    cat << 'EOF' >> "${APP_DIR}/.env"
SMTP_HOST="127.0.0.1"
SMTP_PORT="587"
SMTP_USER="ai@searchbiz.co.za"
SMTP_PASS="HermesAI@2026!"
IMAP_HOST="127.0.0.1"
IMAP_PORT="993"
IMAP_USER="ai@searchbiz.co.za"
IMAP_PASS="HermesAI@2026!"
EOF
fi

# Clean up any drop-in override
rm -rf /etc/systemd/system/hermes-agent.service.d

echo "Restarting hermes-agent service..."
systemctl daemon-reload
systemctl restart hermes-agent

echo "✅ Hermes Agent updated and running!"
systemctl status hermes-agent --no-pager
