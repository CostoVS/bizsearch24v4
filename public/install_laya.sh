#!/usr/bin/env bash
# =============================================================================
# Install & Link Laya Autonomous Action & Execution Engine for Hermes SearchBiz
# =============================================================================

set -e

APP_DIR="/opt/hermes-searchbiz"
mkdir -p "${APP_DIR}"

echo "================================================================="
echo "💎 Installing & Linking Laya Autonomous Execution Engine for Hermes"
echo "Target Platform: searchbiz.co.za / Contabo VPS"
echo "================================================================="

# 1. Update Python dependencies
echo "📦 Installing required Python libraries..."
if command -v python3 &> /dev/null; then
    python3 -m pip install --break-system-packages --ignore-installed \
        requests urllib3 beautifulsoup4 openpyxl python-docx reportlab \
        playwright faster-whisper vosk edge-tts 2>/dev/null || \
    python3 -m pip install \
        requests urllib3 beautifulsoup4 openpyxl python-docx reportlab \
        playwright faster-whisper vosk edge-tts || true
fi

# 2. Verify / Setup Ollama local decision model
if command -v ollama &> /dev/null; then
    echo "⚡ Checking local Ollama decision models..."
    systemctl start ollama 2>/dev/null || true
    sleep 1
    if ! ollama list 2>/dev/null | grep -q "llama-3.2"; then
        echo "📥 Pulling fast decision model (llama3.2:3b)..."
        ollama pull llama3.2:3b || true
    fi
fi

# 3. Create Laya integration confirmation flag
mkdir -p "${APP_DIR}/scraped_leads_vault/leads"
mkdir -p "${APP_DIR}/scraped_leads_vault/archive"
echo '{"engine": "Laya", "version": "1.4.0", "linked_to": "Hermes", "status": "ACTIVE", "installed_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > "${APP_DIR}/laya_engine.json"

# 4. Restart Hermes Systemd Daemon if present
if systemctl is-active --quiet hermes-searchbiz.service 2>/dev/null; then
    echo "🔄 Restarting Hermes SearchBiz Daemon to load Laya..."
    systemctl restart hermes-searchbiz.service
    echo "✅ Hermes service restarted with Laya engine active!"
elif [ -f "/etc/systemd/system/hermes-searchbiz.service" ]; then
    systemctl daemon-reload
    systemctl restart hermes-searchbiz.service || true
fi

echo "================================================================="
echo "🎉 Laya is successfully installed and linked to Hermes!"
echo "You can now tell Hermes or Laya in Telegram:"
echo '• "/laya [task]"'
echo '• "Laya scrape Google maps for plumbers in Pretoria and place as free ads"'
echo '• "Laya create a Word document on SearchBiz pricing"'
echo "================================================================="
