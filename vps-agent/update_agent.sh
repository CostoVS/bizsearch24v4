#!/usr/bin/env bash
# =============================================================================
# Quick Update Script for Hermes Agent on VPS
# =============================================================================
set -e

APP_DIR="/opt/hermes-searchbiz"
mkdir -p "${APP_DIR}"
mkdir -p "${APP_DIR}/leads_storage"

echo "Ensuring Python dependencies and local Ollama are ready..."
if command -v pip3 &> /dev/null; then
    pip3 install --break-system-packages edge-tts requests python-docx reportlab pillow 2>/dev/null || true
fi

# Ensure Ollama service is running if installed
if command -v ollama &> /dev/null; then
    systemctl start ollama 2>/dev/null || true
    # Check if a model is installed; if not, pull qwen2.5:3b in background
    if ! ollama list 2>/dev/null | grep -q -E 'qwen2.5|llama3|mistral'; then
        echo "Pulling lightweight qwen2.5:3b model for Ollama..."
        ollama pull qwen2.5:3b || true
    fi
fi

# Ensure all scripts are executable in both working directory and install directory
chmod +x *.sh 2>/dev/null || true

echo "Updating /opt/hermes-searchbiz scripts and tools..."
cp hermes_searchbiz_agent.py "${APP_DIR}/hermes_searchbiz_agent.py"
chmod +x "${APP_DIR}/hermes_searchbiz_agent.py"

# Deploy Open-Source Monitor & Security CLI tools
if [ -f "monitor_vps.sh" ]; then
    cp monitor_vps.sh "${APP_DIR}/monitor_vps.sh"
    chmod +x "${APP_DIR}/monitor_vps.sh"
    cp monitor_vps.sh /usr/local/bin/monitor_vps 2>/dev/null || true
    chmod +x /usr/local/bin/monitor_vps 2>/dev/null || true
fi

if [ -f "setup_security.sh" ]; then
    cp setup_security.sh "${APP_DIR}/setup_security.sh"
    chmod +x "${APP_DIR}/setup_security.sh"
fi

if [ -f "clean_vps.sh" ]; then
    cp clean_vps.sh "${APP_DIR}/clean_vps.sh"
    chmod +x "${APP_DIR}/clean_vps.sh"
    cp clean_vps.sh /usr/local/bin/clean_vps 2>/dev/null || true
    chmod +x /usr/local/bin/clean_vps 2>/dev/null || true
fi

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

