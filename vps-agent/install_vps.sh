#!/usr/bin/env bash
# =============================================================================
# Automated Installer: Hermes Agent + Ollama (qwen2.5:3b) on Linux VPS
# =============================================================================
set -e

echo "=========================================================="
echo "🚀 Installing Hermes Executive Agent for SearchBiz..."
echo "=========================================================="

# 1. Update packages and install python3
if command -v apt-get &> /dev/null; then
    apt-get update -y
    apt-get install -y python3 curl git
elif command -v yum &> /dev/null; then
    yum install -y python3 curl git
fi

# 2. Install Ollama if not present
if ! command -v ollama &> /dev/null; then
    echo "📦 Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo "✅ Ollama already installed."
fi

# 3. Start Ollama and pull qwen2.5:3b (~2.2 GB)
echo "🧠 Ensuring Ollama service is active..."
systemctl start ollama || true
sleep 3

echo "📥 Pulling qwen2.5:3b model into Ollama..."
ollama pull qwen2.5:3b

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
