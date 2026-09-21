#!/usr/bin/env bash
# =============================================================================
# Quick Update Script for Hermes Agent on VPS
# =============================================================================
set -e

APP_DIR="/opt/hermes-searchbiz"
mkdir -p "${APP_DIR}"
mkdir -p "${APP_DIR}/leads_storage"

echo "📦 Ensuring ffmpeg and audio decoder tools are installed on VPS..."
if ! command -v ffmpeg &> /dev/null || ! command -v flac &> /dev/null; then
    if command -v apt-get &> /dev/null; then
        apt-get update -y && apt-get install -y ffmpeg flac python3-pip python3-dev build-essential || true
    elif command -v yum &> /dev/null; then
        yum install -y ffmpeg flac python3-pip || true
    fi
fi

echo "📦 Installing Open-Source Voice Reader (faster-whisper, vosk, edge-tts)..."
if command -v pip3 &> /dev/null; then
    pip3 install --break-system-packages --ignore-installed faster-whisper vosk edge-tts requests python-docx reportlab pillow || \
    pip3 install --break-system-packages faster-whisper vosk edge-tts requests python-docx reportlab pillow || true
fi

echo "🧠 Pre-caching Open-Source Whisper tiny model on VPS CPU..."
python3 -c "
import sys
try:
    from faster_whisper import WhisperModel
    print('Testing WhisperModel initialization...')
    m = WhisperModel('tiny', device='cpu', compute_type='int8')
    print('✅ Open-Source Whisper Model ready on CPU for instant voice note understanding!')
except Exception as e:
    print('⚠️ Whisper model note:', e)
" || true

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

# Ensure .env has active SearchBiz API and ai@searchbiz.co.za credentials
if [ -f "${APP_DIR}/.env" ]; then
    sed -i '/SEARCHBIZ_API_URL/d' "${APP_DIR}/.env"
    sed -i '/SEARCHBIZ_BOT_SECRET/d' "${APP_DIR}/.env"
    sed -i '/SMTP_/d' "${APP_DIR}/.env"
    sed -i '/IMAP_/d' "${APP_DIR}/.env"
    cat << 'EOF' >> "${APP_DIR}/.env"
SEARCHBIZ_API_URL="https://searchbiz.co.za"
SEARCHBIZ_BOT_SECRET="searchbiz_agent_key_2026"
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

