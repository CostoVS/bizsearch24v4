#!/usr/bin/env bash
# =============================================================================
# Fast, Low-RAM Update Script for Hermes Agent on Contabo VPS
# =============================================================================
set -e

APP_DIR="/opt/hermes-searchbiz"
mkdir -p "${APP_DIR}"
mkdir -p "${APP_DIR}/leads_storage"
mkdir -p "${APP_DIR}/listings"
mkdir -p "${APP_DIR}/scraped_leads_vault"

echo "🧹 Freeing inactive VPS RAM buffers & stopping old agent instance before update..."
systemctl stop hermes-agent 2>/dev/null || true
pkill -9 -f "playwright" 2>/dev/null || true
pkill -9 -f "chromium" 2>/dev/null || true
sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true

echo "📦 Checking ffmpeg and audio decoder tools on VPS..."
if ! command -v ffmpeg &> /dev/null || ! command -v flac &> /dev/null; then
    if command -v apt-get &> /dev/null; then
        apt-get update -y && apt-get install -y ffmpeg flac python3-pip python3-dev build-essential || true
    elif command -v yum &> /dev/null; then
        yum install -y ffmpeg flac python3-pip || true
    fi
else
    echo "✅ ffmpeg and flac already installed."
fi

echo "📦 Checking Python dependencies (faster-whisper, vosk, edge-tts, beautifulsoup4, schedule, playwright)..."
if python3 -c "import faster_whisper, vosk, edge_tts, requests, docx, reportlab, PIL, bs4, schedule, playwright" 2>/dev/null; then
    echo "✅ All Python dependencies already installed (skipping redundant pip download)!"
else
    echo "📥 Installing missing Python packages..."
    if command -v pip3 &> /dev/null; then
        pip3 install --break-system-packages faster-whisper vosk edge-tts requests python-docx reportlab pillow beautifulsoup4 schedule playwright || true
    fi
fi

echo "🎭 Checking Playwright Stealth Chromium..."
if [ -d "/root/.cache/ms-playwright" ] && [ -n "$(ls -A /root/.cache/ms-playwright 2>/dev/null)" ]; then
    echo "✅ Playwright Stealth Chromium already installed!"
elif python3 -c "import playwright" 2>/dev/null; then
    python3 -m playwright install chromium 2>/dev/null || true
    python3 -m playwright install-deps chromium 2>/dev/null || true
    echo "✅ Playwright Stealth Chromium ready!"
fi

# Ensure Ollama service is running if installed
if command -v ollama &> /dev/null; then
    systemctl start ollama 2>/dev/null || true
fi

# Ensure all scripts are executable in both working directory and install directory
chmod +x *.sh 2>/dev/null || true

echo "🚀 Updating /opt/hermes-searchbiz scripts and tools..."
if [ -f "hermes_searchbiz_agent.py" ] && [ "$(realpath hermes_searchbiz_agent.py)" != "${APP_DIR}/hermes_searchbiz_agent.py" ]; then
    cp hermes_searchbiz_agent.py "${APP_DIR}/hermes_searchbiz_agent.py"
else
    curl -fsSL --connect-timeout 3 --max-time 15 https://searchbiz.co.za/api/bot/agent-script -o "${APP_DIR}/hermes_searchbiz_agent.py.tmp" 2>/dev/null && \
    mv "${APP_DIR}/hermes_searchbiz_agent.py.tmp" "${APP_DIR}/hermes_searchbiz_agent.py" || true
fi
chmod +x "${APP_DIR}/hermes_searchbiz_agent.py"

# Deploy 6,931 South African Suburbs & Areas Database
if [ -f "sa_areas_database.json" ]; then
    cp sa_areas_database.json "${APP_DIR}/sa_areas_database.json"
    cp sa_areas_database.json "${APP_DIR}/searchbiz_all_areas.json"
elif [ -f "searchbiz_all_areas.json" ]; then
    cp searchbiz_all_areas.json "${APP_DIR}/searchbiz_all_areas.json"
    cp searchbiz_all_areas.json "${APP_DIR}/sa_areas_database.json"
else
    echo "Downloading 6,931 SA areas database from SearchBiz..."
    curl -sSL --connect-timeout 3 --max-time 15 https://searchbiz.co.za/sa_areas_database.json -o "${APP_DIR}/sa_areas_database.json" || true
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

for sh_file in push_ads.sh reset_and_scrape.sh; do
    if [ -f "$sh_file" ]; then
        cp "$sh_file" "${APP_DIR}/$sh_file" 2>/dev/null || true
        chmod +x "${APP_DIR}/$sh_file" "$sh_file" 2>/dev/null || true
    fi
done

if [ -f "hermes_laya_permanent_memory.json" ]; then
    cp hermes_laya_permanent_memory.json "${APP_DIR}/hermes_laya_permanent_memory.json" 2>/dev/null || true
fi

# Link all harvested CSVs between /opt/hermes-searchbiz and local leads_storage/ & listings/
mkdir -p leads_storage listings scraped_leads_vault ../listings "${APP_DIR}/leads_storage" "${APP_DIR}/listings" "${APP_DIR}/scraped_leads_vault" 2>/dev/null || true
find "${APP_DIR}" -name "*.csv" -type f 2>/dev/null | while read -r csv_fp; do
    base_fn="$(basename "$csv_fp")"
    ln -f "$csv_fp" "leads_storage/$base_fn" 2>/dev/null || cp -f "$csv_fp" "leads_storage/$base_fn" 2>/dev/null || true
    ln -f "$csv_fp" "listings/$base_fn" 2>/dev/null || cp -f "$csv_fp" "listings/$base_fn" 2>/dev/null || true
    ln -f "$csv_fp" "../listings/$base_fn" 2>/dev/null || cp -f "$csv_fp" "../listings/$base_fn" 2>/dev/null || true
done

# Automatically stream all scraped CSVs into ../data/db.json if db.json has 0 ads (<500KB) while CSVs exist on VPS
DB_SIZE=0
if [ -f "../data/db.json" ]; then
    DB_SIZE=$(wc -c < "../data/db.json" 2>/dev/null || echo 0)
fi
CSV_COUNT=$(find "${APP_DIR}" listings scraped_leads_vault -name "*.csv" -type f 2>/dev/null | head -n 5 | wc -l)
if [ "${DB_SIZE}" -lt 500000 ] && [ "${CSV_COUNT}" -gt 0 ]; then
    echo "🚀 Detected scraped CSV files on VPS with empty db.json — streaming all scraped businesses into SearchBiz.co.za..."
    python3 -u "${APP_DIR}/hermes_searchbiz_agent.py" --push-ads || true
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

# Ensure data directories exist
mkdir -p "${APP_DIR}/leads_storage"
mkdir -p "${APP_DIR}/listings"
mkdir -p "../.data" "../data" 2>/dev/null || true

echo "🛡️ Verifying SearchBiz uploaded ads database across backups (Zero-RAM O(1) mode)..."
python3 -c "
import os, json, shutil

paths = [
    '../data/db.json',
    '../.data/db.json',
    '../data/backup_db.json',
    '../.data/backup_db.json',
    '/opt/hermes-searchbiz/leads_storage/searchbiz_db_backup.json'
]

latest_purge_at = 0
purged_path = None
for p in ['../.data/db.json', '../data/db.json']:
    if os.path.exists(p):
        try:
            sz = os.path.getsize(p)
            if 2 < sz < 2000000:
                with open(p, 'r', encoding='utf-8', errors='ignore') as f:
                    d = json.load(f)
                    if isinstance(d, dict) and d.get('lastPurgeAt', 0) > latest_purge_at:
                        latest_purge_at = d.get('lastPurgeAt', 0)
                        purged_path = p
        except Exception:
            pass

best_path = None
best_size = -1
for p in paths:
    if os.path.exists(p):
        try:
            sz = os.path.getsize(p)
            if sz <= 10:
                continue
            # Never call json.load() on huge files (>2MB); verify JSON head/tail in 0 KB of RAM!
            with open(p, 'rb') as f:
                head = f.read(256).decode('utf-8', errors='ignore').strip()
                if not head.startswith('{') or '\"ads\"' not in head:
                    continue
                if sz > 512:
                    f.seek(max(0, sz - 512))
                tail = f.read(512).decode('utf-8', errors='ignore').strip()
                if not tail.endswith('}'):
                    continue
            if latest_purge_at > 0 and purged_path and p != purged_path:
                continue
            if sz > best_size:
                best_size = sz
                best_path = p
        except Exception:
            pass

if not best_path and purged_path:
    best_path = purged_path
    best_size = os.path.getsize(purged_path)

if best_path and best_size > 0:
    mb_sz = round(best_size / (1024 * 1024), 2)
    print(f'✅ Verified master SearchBiz database ({mb_sz} MB) at {best_path}.')
    for p in ['../data/db.json', '../.data/db.json']:
        if p != best_path:
            try:
                os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
                if not os.path.exists(p) or abs(os.path.getsize(p) - best_size) > 1024:
                    shutil.copy2(best_path, p)
            except Exception:
                pass
" || true

chmod 777 ../.data ../data ../.data/db.json ../data/db.json 2>/dev/null || true

# Ensure SearchBiz Web Container (port 3005 / 3000) & Nginx are up to prevent 502 Bad Gateway
if ! curl -sSf --connect-timeout 2 --max-time 4 "http://127.0.0.1:3005/api/storage?statsOnly=true" >/dev/null 2>&1 && ! curl -sSf --connect-timeout 2 --max-time 4 "http://127.0.0.1:3000/api/storage?statsOnly=true" >/dev/null 2>&1; then
    echo "🌐 SearchBiz web backend not responding on 3005/3000 — starting searchbiz-web to fix 502 Bad Gateway..."
    if command -v docker &> /dev/null; then
        systemctl start docker 2>/dev/null || true
        docker start searchbiz-postgres-db 2>/dev/null || true
        docker start searchbiz-web 2>/dev/null || (cd .. && docker compose up -d web 2>/dev/null) || (cd /home/thehightable/bizsearch24v4 && docker compose up -d web 2>/dev/null) || true
    fi
    if command -v pm2 &> /dev/null; then
        pm2 restart all 2>/dev/null || true
    fi
fi

if command -v nginx &> /dev/null; then
    systemctl start nginx 2>/dev/null || true
    systemctl reload nginx 2>/dev/null || true
fi

# Non-blocking background pre-warm with strict 3s timeout so update_agent.sh NEVER hangs
(
    sleep 2
    curl -s --connect-timeout 2 --max-time 4 "http://127.0.0.1:3005/" >/dev/null 2>&1 || true
    curl -s --connect-timeout 2 --max-time 3 "http://127.0.0.1:3005/api/storage?statsOnly=true" >/dev/null 2>&1 || true
    curl -s --connect-timeout 2 --max-time 3 "http://127.0.0.1:3005/api/storage?freeOnly=true&includeFeatured=true&page=1&pageSize=12" >/dev/null 2>&1 || true
) &

echo "🔄 Restarting hermes-agent service..."
cp hermes-agent.service /etc/systemd/system/hermes-agent.service 2>/dev/null || true
systemctl daemon-reload
systemctl restart hermes-agent

echo "✅ Hermes Agent updated and running!"
systemctl status hermes-agent --no-pager -l || true


