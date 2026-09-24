#!/usr/bin/env bash
# =============================================================================
# Automated Installer: Hermes Agent + Ollama (qwen2.5:3b) on Linux VPS
# =============================================================================
set -e

echo "=========================================================="
echo "🚀 Installing Hermes Executive Agent for SearchBiz..."
echo "=========================================================="

# 1. Update packages and install python3 & dependencies
if command -v apt-get &> /dev/null; then
    apt-get update -y
    apt-get install -y python3 python3-pip sqlite3 curl git ffmpeg flac build-essential python3-dev || true
elif command -v yum &> /dev/null; then
    yum install -y python3 python3-pip sqlite curl git ffmpeg flac || true
fi

# Python speech, voice synthesis, scraping, and executive tools
pip3 install --break-system-packages --ignore-installed faster-whisper vosk edge-tts reportlab python-docx requests pillow beautifulsoup4 schedule playwright || \
pip3 install --break-system-packages faster-whisper vosk edge-tts reportlab python-docx requests pillow beautifulsoup4 schedule playwright || true

# Install Playwright Chromium browser binaries
python3 -m playwright install chromium 2>/dev/null || true
python3 -m playwright install-deps chromium 2>/dev/null || true

# Pre-cache open source Whisper tiny model for instant zero-lag voice note transcription
python3 -c "
try:
    from faster_whisper import WhisperModel
    WhisperModel('tiny', device='cpu', compute_type='int8')
except Exception:
    pass
" || true

# 2. Install Ollama if not present
if ! command -v ollama &> /dev/null; then
    echo "📦 Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo "✅ Ollama already installed."
fi

# 3. Setup Llama-3.2-3B-Instruct-Abliterated GGUF into Ollama
echo "🧠 Ensuring Ollama service is active..."
systemctl start ollama || true
sleep 3

if [ -f "./setup_abliterated_model.sh" ]; then
    bash ./setup_abliterated_model.sh
else
    echo "📥 Pulling Llama-3.2-3B-Instruct-Abliterated GGUF into Ollama..."
    ollama pull hf.co/MaziyarPanahi/Llama-3.2-3B-Instruct-abliterated-GGUF:Q4_K_M && \
    ollama cp hf.co/MaziyarPanahi/Llama-3.2-3B-Instruct-abliterated-GGUF:Q4_K_M llama-3.2-3b-instruct-abliterated || \
    ollama pull richardyoung/llama-3.2-3b-instruct-abliterated || \
    ollama pull llama3.2:3b
fi

# 4. Create App Directory
APP_DIR="/opt/hermes-searchbiz"
echo "📂 Setting up agent directory at ${APP_DIR}..."
mkdir -p "${APP_DIR}"
cp hermes_searchbiz_agent.py "${APP_DIR}/"
chmod +x "${APP_DIR}/hermes_searchbiz_agent.py"

if [ ! -f "${APP_DIR}/.env" ]; then
    cp .env.vps "${APP_DIR}/.env"
    echo "📝 Created default .env at ${APP_DIR}/.env"
fi

# 5. Install systemd service
echo "⚙️ Configuring systemd service..."
cp hermes-agent.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable hermes-agent
systemctl restart hermes-agent

echo "=========================================================="
echo "🎉 Hermes Agent is INSTALLED and ACTIVE on your VPS!"
echo "Telegram Bot: @Searchbiz_bot"
echo ""
echo "To check agent logs in real time:"
echo "   journalctl -u hermes-agent -f"
echo ""
echo "To restart agent:"
echo "   systemctl restart hermes-agent"
echo "=========================================================="
