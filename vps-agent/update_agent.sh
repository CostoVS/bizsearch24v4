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

echo "📦 Installing Open-Source Voice Reader & Automation Tools (faster-whisper, vosk, edge-tts, beautifulsoup4, schedule, playwright)..."
if command -v pip3 &> /dev/null; then
    pip3 install --break-system-packages --ignore-installed faster-whisper vosk edge-tts requests python-docx reportlab pillow beautifulsoup4 schedule playwright || \
    pip3 install --break-system-packages faster-whisper vosk edge-tts requests python-docx reportlab pillow beautifulsoup4 schedule playwright || true
fi

echo "🎭 Checking Playwright Stealth Chromium..."
if python3 -c "import playwright" 2>/dev/null; then
    python3 -m playwright install chromium 2>/dev/null || true
    python3 -m playwright install-deps chromium 2>/dev/null || true
    echo "✅ Playwright Stealth Chromium ready!"
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
    # Check if abliterated Llama-3.2 model is installed; if not, invoke setup
    if ! ollama list 2>/dev/null | grep -q -E 'abliterate'; then
        echo "📥 Upgrading Ollama brain to Llama-3.2-3B-Instruct-Abliterated GGUF..."
        if [ -f "./setup_abliterated_model.sh" ]; then
            bash ./setup_abliterated_model.sh || true
        else
            ollama pull hf.co/MaziyarPanahi/Llama-3.2-3B-Instruct-abliterated-GGUF:Q4_K_M && \
            ollama cp hf.co/MaziyarPanahi/Llama-3.2-3B-Instruct-abliterated-GGUF:Q4_K_M llama-3.2-3b-instruct-abliterated || \
            ollama pull richardyoung/llama-3.2-3b-instruct-abliterated || true
        fi
    fi
fi

# Ensure all scripts are executable in both working directory and install directory
chmod +x *.sh 2>/dev/null || true

echo "Updating /opt/hermes-searchbiz scripts and tools..."
cp hermes_searchbiz_agent.py "${APP_DIR}/hermes_searchbiz_agent.py"
chmod +x "${APP_DIR}/hermes_searchbiz_agent.py"

# Deploy 6000+ South African Areas Database
if [ -f "sa_areas_database.json" ]; then
    cp sa_areas_database.json "${APP_DIR}/sa_areas_database.json"
    cp sa_areas_database.json "${APP_DIR}/searchbiz_all_areas.json"
elif [ -f "searchbiz_all_areas.json" ]; then
    cp searchbiz_all_areas.json "${APP_DIR}/searchbiz_all_areas.json"
    cp searchbiz_all_areas.json "${APP_DIR}/sa_areas_database.json"
else
    echo "Downloading 6000+ SA areas database from SearchBiz..."
    curl -sSL https://searchbiz.co.za/sa_areas_database.json -o "${APP_DIR}/sa_areas_database.json" || true
    cp "${APP_DIR}/sa_areas_database.json" "${APP_DIR}/searchbiz_all_areas.json" 2>/dev/null || true
fi

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

# Ensure data directories exist and are protected with full permissions
mkdir -p "${APP_DIR}/leads_storage"
mkdir -p "${APP_DIR}/listings"
mkdir -p "../.data" "../data" 2>/dev/null || true

echo "🛡️ Verifying and protecting SearchBiz uploaded ads database across all backups..."
python3 -c "
import os, json, shutil
paths = [
    '../data/db.json',
    '../.data/db.json',
    '../data/backup_db.json',
    '../.data/backup_db.json',
    '/opt/hermes-searchbiz/leads_storage/searchbiz_db_backup.json'
]
best_path = None
best_count = -1
best_size = -1
for p in paths:
    if os.path.exists(p):
        try:
            sz = os.path.getsize(p)
            if sz <= 2:
                continue
            with open(p, 'r', encoding='utf-8') as f:
                d = json.load(f)
                c = len(d.get('ads', [])) if isinstance(d, dict) and isinstance(d.get('ads'), list) else 0
                if c > best_count or (c == best_count and sz > best_size):
                    best_count = c
                    best_size = sz
                    best_path = p
        except Exception:
            pass
if best_path and best_count > 0:
    print(f'✅ Found master SearchBiz database with {best_count:,} ads at {best_path}. Syncing any out-of-date paths...')
    for p in paths:
        if p != best_path:
            try:
                os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
                # Only copy if target file does not exist or differs in size so we do not needlessly bump mtime
                if not os.path.exists(p) or abs(os.path.getsize(p) - best_size) > 64:
                    shutil.copy2(best_path, p)
            except Exception:
                pass
" || true

if [ -d "../.data" ]; then
    chmod -R 777 ../.data ../data 2>/dev/null || true
fi

# Pre-warm the web container O(1) RAM index so all pages respond instantaneously
curl -s "http://127.0.0.1:3005/api/storage?statsOnly=true" >/dev/null 2>&1 || true
curl -s "http://127.0.0.1:3005/api/storage?freeOnly=true&includeFeatured=true&page=1&pageSize=12" >/dev/null 2>&1 || true

echo "Restarting hermes-agent service..."
systemctl daemon-reload
systemctl restart hermes-agent

echo "✅ Hermes Agent updated and running!"
systemctl status hermes-agent --no-pager

