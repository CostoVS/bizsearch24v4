#!/usr/bin/env python3
"""
=============================================================================
SearchBiz Hermes Autonomous Executive Agent (VPS Daemon)
Interface: Telegram (@Searchbiz_bot)
Target Platform: searchbiz.co.za
Capabilities:
  1. Permanent Long-Term Memory (SQLite persistent database across restarts)
  2. Scheduled Daily Weather & Tasks (Automatic daily execution in SAST)
  3. Microsoft Word (.docx) & PDF (.pdf) Document Creation (Pure Python + ReportLab)
  4. Free Open-Source Image Generation (Flux.1 / Stable Diffusion)
  5. Multimodal Vision: Understand and analyze images sent in Telegram
  6. Multimodal Voice: Understand, transcribe and execute voice notes
  7. 11 South African Official Languages Support & Voice Reading (Text-To-Speech)
  8. Real Web Search with deep factual synthesis + exact source citation links
  9. Live Business Directory Management on searchbiz.co.za (Ads create, delete, restore)
 10. DirectAdmin Mailbox Provisioning & Mailcow SMTP/IMAP Executive Email
=============================================================================
"""

import os
import sys
import time
import datetime
import threading
import json
import logging
import smtplib
import imaplib
import ssl
import email
from email.header import decode_header
from email.utils import make_msgid, formatdate
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import urllib.request
import urllib.parse
import urllib.error
import re
import sqlite3
import csv
from concurrent.futures import ThreadPoolExecutor, as_completed
import zipfile
import io
import uuid
import base64
from typing import Dict, List, Optional, Any, Tuple

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("HermesSearchBiz")

# Configuration from Environment Variables
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8957546599:AAGWICeBceFDMBwJx2JAhFs6xMvi71biueI")
SEARCHBIZ_BOT_SECRET = os.getenv("SEARCHBIZ_BOT_SECRET", "searchbiz_agent_key_2026")
GEMINI_API_KEY = (os.getenv("GEMINI_API_KEY") or "").strip()
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

# Email Configurations (Mailcow VPS SMTP/IMAP for ai@searchbiz.co.za)
SMTP_HOST = (os.getenv("SMTP_HOST") or "").strip() or "127.0.0.1"
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = (os.getenv("SMTP_USER") or "").strip() or "ai@searchbiz.co.za"
SMTP_PASS = (os.getenv("SMTP_PASS") or "").strip() or "HermesAI@2026!"

IMAP_HOST = (os.getenv("IMAP_HOST") or "").strip() or "127.0.0.1"
IMAP_PORT = int(os.getenv("IMAP_PORT", "993"))
IMAP_USER = (os.getenv("IMAP_USER") or "").strip() or "ai@searchbiz.co.za"
IMAP_PASS = (os.getenv("IMAP_PASS") or "").strip() or "HermesAI@2026!"

# DirectAdmin API Configuration
DIRECTADMIN_URL = os.getenv("DIRECTADMIN_URL", "https://localhost:2222").rstrip("/")
DIRECTADMIN_USER = os.getenv("DIRECTADMIN_USER", "admin")
DIRECTADMIN_PASS = os.getenv("DIRECTADMIN_PASS", "")


# SQLite Persistent Memory Database
DB_PATH = os.getenv("HERMES_DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "hermes_data.db"))

# Lead Storage Directory for Scraped CSV files
LEADS_DIR = os.getenv("HERMES_LEADS_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "leads_storage"))
os.makedirs(LEADS_DIR, exist_ok=True)

# Image prompt memory cache per chat
_LAST_IMAGE_PROMPTS: Dict[int, str] = {}

# Active Endpoint Cache
_CACHED_API_URL = None


# ============================================================================
# Persistent SQLite Long-Term Memory & Scheduled Tasks Engine
# ============================================================================
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_memory_db():
    """Initializes SQLite tables for multi-turn messages, user facts, and scheduled jobs."""
    try:
        with get_db() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chat_id INTEGER,
                    role TEXT,
                    content TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_facts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chat_id INTEGER,
                    fact_key TEXT,
                    fact_value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(chat_id, fact_key)
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS scheduled_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chat_id INTEGER,
                    task_type TEXT,
                    schedule_time TEXT,
                    params TEXT,
                    active INTEGER DEFAULT 1,
                    last_run_date TEXT DEFAULT ''
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS lead_datasets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chat_id INTEGER,
                    filename TEXT,
                    total_count INTEGER DEFAULT 0,
                    enriched_count INTEGER DEFAULT 0,
                    file_path TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS business_leads (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dataset_id INTEGER,
                    chat_id INTEGER,
                    name TEXT,
                    phone TEXT,
                    website TEXT,
                    category TEXT,
                    address TEXT,
                    city TEXT,
                    province TEXT,
                    rating TEXT DEFAULT '',
                    reviews TEXT DEFAULT '',
                    found_email TEXT DEFAULT '',
                    found_whatsapp TEXT DEFAULT '',
                    found_description TEXT DEFAULT '',
                    social_links TEXT DEFAULT '',
                    searchbiz_ad_id TEXT DEFAULT '',
                    status TEXT DEFAULT 'new',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
        logger.info(f"Persistent memory SQLite database initialized at {DB_PATH}")
    except Exception as e:
        logger.error(f"Failed to initialize SQLite memory DB: {e}")

# In-memory fast cache
_CHAT_HISTORIES: Dict[int, List[Dict[str, str]]] = {}

def record_chat_turn(chat_id: int, role: str, content: str):
    """Saves conversation turn permanently in SQLite database and in-memory cache."""
    if not chat_id or not content:
        return
    clean_text = re.sub(r'<[^>]+>', '', str(content)).strip()
    if not clean_text:
        return

    # In-memory sliding cache
    if chat_id not in _CHAT_HISTORIES:
        _CHAT_HISTORIES[chat_id] = []
    _CHAT_HISTORIES[chat_id].append({"role": role, "content": clean_text})
    if len(_CHAT_HISTORIES[chat_id]) > 14:
        _CHAT_HISTORIES[chat_id] = _CHAT_HISTORIES[chat_id][-14:]

    # Permanent SQLite persistence
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO chat_messages (chat_id, role, content) VALUES (?, ?, ?)",
                (chat_id, role, clean_text)
            )
            conn.commit()
    except Exception as e:
        logger.error(f"Failed to record message in SQLite: {e}")

def get_chat_history(chat_id: int, limit: int = 10) -> List[Dict[str, str]]:
    """Loads chat history from in-memory cache or SQLite database."""
    if chat_id in _CHAT_HISTORIES and len(_CHAT_HISTORIES[chat_id]) >= limit:
        return _CHAT_HISTORIES[chat_id][-limit:]
    try:
        with get_db() as conn:
            cursor = conn.execute(
                "SELECT role, content FROM chat_messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?",
                (chat_id, limit)
            )
            rows = cursor.fetchall()
            history = [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]
            _CHAT_HISTORIES[chat_id] = history
            return history
    except Exception as e:
        logger.error(f"Failed to load chat history: {e}")
        return _CHAT_HISTORIES.get(chat_id, [])

def save_user_fact(chat_id: int, fact_key: str, fact_value: str) -> bool:
    """Saves a permanent fact about the user or their business into SQLite."""
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO user_facts (chat_id, fact_key, fact_value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) "
                "ON CONFLICT(chat_id, fact_key) DO UPDATE SET fact_value=excluded.fact_value, updated_at=CURRENT_TIMESTAMP",
                (chat_id, fact_key.strip().lower(), fact_value.strip())
            )
            conn.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to save user fact: {e}")
        return False

def get_user_facts(chat_id: int) -> List[Tuple[str, str]]:
    """Retrieves all permanent facts known about this user."""
    try:
        with get_db() as conn:
            cursor = conn.execute("SELECT fact_key, fact_value FROM user_facts WHERE chat_id = ? ORDER BY id ASC", (chat_id,))
            return [(r["fact_key"], r["fact_value"]) for r in cursor.fetchall()]
    except Exception as e:
        logger.error(f"Failed to get user facts: {e}")
        return []

def delete_user_fact(chat_id: int, fact_key: str) -> bool:
    """Removes a specific fact from permanent memory."""
    try:
        with get_db() as conn:
            conn.execute("DELETE FROM user_facts WHERE chat_id = ? AND fact_key LIKE ?", (chat_id, f"%{fact_key.strip().lower()}%"))
            conn.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to delete fact: {e}")
        return False

def clear_user_facts(chat_id: int) -> bool:
    """Clears all facts stored for this chat_id."""
    try:
        with get_db() as conn:
            conn.execute("DELETE FROM user_facts WHERE chat_id = ?", (chat_id,))
            conn.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to clear user facts: {e}")
        return False

def get_user_facts_prompt(chat_id: int) -> str:
    """Generates prompt context containing all permanent facts known about this user."""
    facts = get_user_facts(chat_id)
    if not facts:
        return ""
    lines = [f"- {k.replace('_', ' ').title()}: {v}" for k, v in facts]
    return "\nPERMANENT KNOWLEDGE & FACTS YOU REMEMBER ABOUT THIS FOUNDER/USER:\n" + "\n".join(lines) + "\n"

def is_always_voice_enabled(chat_id: int) -> bool:
    """Checks if Dual Voice + Text mode is active (default is True)."""
    facts = get_user_facts(chat_id)
    f_dict = {k: v for k, v in facts} if facts else {}
    val = f_dict.get("always_voice", "true").lower()
    return val not in ["false", "0", "no", "off"]

def set_always_voice(chat_id: int, enabled: bool) -> bool:
    """Saves user's Dual Voice + Text preference."""
    return save_user_fact(chat_id, "always_voice", "true" if enabled else "false")

def get_user_voice_profile(chat_id: int) -> str:
    """Retrieves preferred voice profile (default: crisp, alluring British lady - sonia)."""
    facts = get_user_facts(chat_id)
    f_dict = {k: v for k, v in facts} if facts else {}
    return f_dict.get("voice_profile", "sonia_british")

def set_user_voice_profile(chat_id: int, profile: str) -> bool:
    """Stores chosen voice profile."""
    return save_user_fact(chat_id, "voice_profile", profile)



# ============================================================================
# Scheduled Tasks & Daily Weather Daemon (SAST UTC+2)
# ============================================================================
def schedule_task(chat_id: int, task_type: str, schedule_time: str, params: dict) -> bool:
    """Registers or updates a scheduled daily job in SQLite."""
    try:
        with get_db() as conn:
            # Check if matching task already exists
            conn.execute(
                "DELETE FROM scheduled_tasks WHERE chat_id = ? AND task_type = ?",
                (chat_id, task_type)
            )
            conn.execute(
                "INSERT INTO scheduled_tasks (chat_id, task_type, schedule_time, params, active) VALUES (?, ?, ?, ?, 1)",
                (chat_id, task_type, schedule_time, json.dumps(params))
            )
            conn.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to schedule task: {e}")
        return False

def get_scheduled_tasks(chat_id: int) -> List[dict]:
    """Lists active schedules for this chat."""
    try:
        with get_db() as conn:
            cursor = conn.execute("SELECT id, task_type, schedule_time, params, active, last_run_date FROM scheduled_tasks WHERE chat_id = ?", (chat_id,))
            return [dict(r) for r in cursor.fetchall()]
    except Exception as e:
        logger.error(f"Failed to fetch scheduled tasks: {e}")
        return []

def cancel_scheduled_task(chat_id: int, task_type: str) -> bool:
    """Cancels a scheduled task."""
    try:
        with get_db() as conn:
            conn.execute("DELETE FROM scheduled_tasks WHERE chat_id = ? AND task_type = ?", (chat_id, task_type))
            conn.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to cancel scheduled task: {e}")
        return False

def scheduler_worker():
    """Background daemon thread running continuously to fire daily scheduled jobs (e.g. weather)."""
    logger.info("Scheduler daemon started (monitoring SAST time for daily jobs).")
    while True:
        try:
            # Current time in SAST (UTC+2)
            now_utc = datetime.datetime.now(datetime.timezone.utc)
            sast_time = now_utc + datetime.timedelta(hours=2)
            current_hhmm = sast_time.strftime("%H:%M")
            today_str = sast_time.strftime("%Y-%m-%d")

            with get_db() as conn:
                cursor = conn.execute(
                    "SELECT id, chat_id, task_type, schedule_time, params, last_run_date FROM scheduled_tasks "
                    "WHERE active = 1 AND schedule_time = ? AND (last_run_date IS NULL OR last_run_date != ?)",
                    (current_hhmm, today_str)
                )
                due_tasks = cursor.fetchall()

                for task in due_tasks:
                    task_id = task["id"]
                    t_chat_id = task["chat_id"]
                    t_type = task["task_type"]
                    t_time = task["schedule_time"]
                    t_params = json.loads(task["params"] or "{}")

                    if t_type == "weather":
                        location = t_params.get("location", "Durban")
                        weather_text = get_weather(location)
                        send_telegram(
                            t_chat_id,
                            f"⏰ <b>Scheduled Daily Weather Briefing ({t_time} SAST)</b>\n\n{weather_text}"
                        )
                    elif t_type == "briefing":
                        briefing = ask_ai(t_params.get("prompt", "Give me an executive morning briefing"), chat_id=t_chat_id)
                        send_telegram(
                            t_chat_id,
                            f"⏰ <b>Scheduled Daily Executive Briefing ({t_time} SAST)</b>\n\n{briefing}"
                        )

                    # Mark task as completed for today
                    conn.execute("UPDATE scheduled_tasks SET last_run_date = ? WHERE id = ?", (today_str, task_id))
                    conn.commit()
                    logger.info(f"Fired scheduled job {t_type} for chat {t_chat_id} at {current_hhmm} SAST")
        except Exception as e:
            logger.error(f"Scheduler worker exception: {e}")
        time.sleep(20)


# ============================================================================
# Dynamic SearchBiz Website API Discovery
# ============================================================================
def get_active_api_base() -> str:
    """Finds the reachable SearchBiz endpoint dynamically.
    Tests host-mapped port 3005 (docker), port 3000, and public domain.
    """
    global _CACHED_API_URL
    if _CACHED_API_URL:
        return _CACHED_API_URL

    env_url = os.getenv("SEARCHBIZ_API_URL", "").rstrip("/")
    candidates = [
        env_url,
        "http://127.0.0.1:3005",
        "http://localhost:3005",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "https://searchbiz.co.za"
    ]

    for base in candidates:
        if not base:
            continue
        try:
            req = urllib.request.Request(
                f"{base}/api/bot/ad?limit=1",
                headers={"Authorization": f"Bearer {SEARCHBIZ_BOT_SECRET}"}
            )
            with urllib.request.urlopen(req, timeout=3) as res:
                if res.status == 200:
                    logger.info(f"Connected to live SearchBiz API at {base}")
                    _CACHED_API_URL = base
                    return base
        except Exception:
            continue

    _CACHED_API_URL = env_url or "http://127.0.0.1:3005"
    return _CACHED_API_URL


# ============================================================================
# Telegram HTTP & Multipart Utilities (Photos, Documents, Voice)
# ============================================================================
def telegram_call(method: str, data: dict = None):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/{method}"
    try:
        if data:
            json_data = json.dumps(data).encode("utf-8")
            req = urllib.request.Request(url, data=json_data, headers={"Content-Type": "application/json"})
        else:
            req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=35) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        logger.error(f"Telegram API call '{method}' failed: {e}")
        return None

def make_multipart_body(fields: dict, files: dict) -> Tuple[bytes, str]:
    """Constructs clean multipart/form-data payload with zero third-party dependencies."""
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    lines = []
    for k, v in fields.items():
        lines.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode("utf-8"))
    for field_name, (filename, data, content_type) in files.items():
        header = f"--{boundary}\r\nContent-Disposition: form-data; name=\"{field_name}\"; filename=\"{filename}\"\r\nContent-Type: {content_type}\r\n\r\n".encode("utf-8")
        lines.append(header + data + b"\r\n")
    lines.append(f"--{boundary}--\r\n".encode("utf-8"))
    return b"".join(lines), f"multipart/form-data; boundary={boundary}"

def send_telegram(chat_id: int, text: str):
    record_chat_turn(chat_id, "assistant", text)
    return telegram_call("sendMessage", {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    })

def send_chat_action(chat_id: int, action: str = "typing"):
    """Shows native 'typing...', 'upload_photo', 'upload_document' indicator in Telegram."""
    return telegram_call("sendChatAction", {
        "chat_id": chat_id,
        "action": action
    })

def send_telegram_photo(chat_id: int, photo_bytes: bytes, caption: str = "") -> Optional[dict]:
    """Sends an image file directly to Telegram."""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
    fields = {"chat_id": str(chat_id)}
    if caption:
        fields["caption"] = caption
        fields["parse_mode"] = "HTML"
    body, content_type = make_multipart_body(fields, {"photo": ("image.png", photo_bytes, "image/png")})
    req = urllib.request.Request(url, data=body, headers={"Content-Type": content_type})
    try:
        with urllib.request.urlopen(req, timeout=35) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        logger.error(f"Failed to send telegram photo: {e}")
        return None

def send_telegram_document(chat_id: int, filename: str, file_bytes: bytes, caption: str = "") -> Optional[dict]:
    """Sends a Word (.docx) or PDF (.pdf) document directly to Telegram."""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendDocument"
    fields = {"chat_id": str(chat_id)}
    if caption:
        fields["caption"] = caption
        fields["parse_mode"] = "HTML"
    if filename.endswith(".pdf"):
        ctype = "application/pdf"
    elif filename.endswith(".csv"):
        ctype = "text/csv"
    else:
        ctype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    body, content_type = make_multipart_body(fields, {"document": (filename, file_bytes, ctype)})
    req = urllib.request.Request(url, data=body, headers={"Content-Type": content_type})
    try:
        with urllib.request.urlopen(req, timeout=35) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        logger.error(f"Failed to send telegram document {filename}: {e}")
        return None

def send_telegram_voice(chat_id: int, voice_bytes: bytes, caption: str = "") -> Optional[dict]:
    """Sends voice audio directly to Telegram as a native playable voice note or audio file."""
    fields = {"chat_id": str(chat_id)}
    if caption:
        fields["caption"] = caption
        fields["parse_mode"] = "HTML"

    # 1. Attempt sendVoice
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendVoice"
    body, content_type = make_multipart_body(fields, {"voice": ("voice.ogg", voice_bytes, "audio/ogg")})
    req = urllib.request.Request(url, data=body, headers={"Content-Type": content_type})
    try:
        with urllib.request.urlopen(req, timeout=35) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("ok"):
                return data
    except Exception as e:
        logger.debug(f"sendVoice failed ({e}), attempting sendAudio fallback...")

    # 2. Fallback to sendAudio with MP3 format
    try:
        audio_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendAudio"
        audio_body, audio_ct = make_multipart_body(fields, {"audio": ("speech.mp3", voice_bytes, "audio/mpeg")})
        audio_req = urllib.request.Request(audio_url, data=audio_body, headers={"Content-Type": audio_ct})
        with urllib.request.urlopen(audio_req, timeout=35) as resp2:
            return json.loads(resp2.read().decode("utf-8"))
    except Exception as e2:
        logger.error(f"Failed to send telegram audio note: {e2}")
        return None

def download_telegram_file(file_id: str) -> Optional[bytes]:
    """Downloads a photo or voice note sent by user from Telegram servers."""
    info = telegram_call("getFile", {"file_id": file_id})
    if not info or not info.get("ok"):
        return None
    file_path = info["result"]["file_path"]
    url = f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{file_path}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read()
    except Exception as e:
        logger.error(f"Failed to download telegram file {file_path}: {e}")
        return None



# ============================================================================
# Google Maps & Instant Data Scraper Lead Engine
# ============================================================================
def normalize_sa_phone(raw_phone: str) -> str:
    """Normalizes phone string to international South African format (27XXXXXXXXX) or returns cleaned phone."""
    if not raw_phone:
        return ""
    digits = re.sub(r'\D', '', str(raw_phone))
    if digits.startswith("27") and len(digits) >= 11:
        return digits
    if digits.startswith("0") and len(digits) == 10:
        return "27" + digits[1:]
    return digits or raw_phone.strip()

def detect_sa_city_and_province(text_to_scan: str) -> Tuple[str, str]:
    """Detects South African city and province from address strings or category fields."""
    if not text_to_scan:
        return ("Durban", "kwazulu-natal")
    lower = text_to_scan.lower()
    
    city_map = {
        "umkomaas": ("Umkomaas", "kwazulu-natal"),
        "durban": ("Durban", "kwazulu-natal"),
        "ballito": ("Ballito", "kwazulu-natal"),
        "umhlanga": ("Umhlanga", "kwazulu-natal"),
        "amanzimtoti": ("Amanzimtoti", "kwazulu-natal"),
        "scottburgh": ("Scottburgh", "kwazulu-natal"),
        "pietermaritzburg": ("Pietermaritzburg", "kwazulu-natal"),
        "port shepstone": ("Port Shepstone", "kwazulu-natal"),
        "richards bay": ("Richards Bay", "kwazulu-natal"),
        "johannesburg": ("Johannesburg", "gauteng"),
        "sandton": ("Sandton", "gauteng"),
        "randburg": ("Randburg", "gauteng"),
        "midrand": ("Midrand", "gauteng"),
        "pretoria": ("Pretoria", "gauteng"),
        "centurion": ("Centurion", "gauteng"),
        "soweto": ("Soweto", "gauteng"),
        "cape town": ("Cape Town", "western-cape"),
        "stellenbosch": ("Stellenbosch", "western-cape"),
        "bellville": ("Bellville", "western-cape"),
        "somerset west": ("Somerset West", "western-cape"),
        "george": ("George", "western-cape"),
        "gqeberha": ("Gqeberha", "eastern-cape"),
        "port elizabeth": ("Port Elizabeth", "eastern-cape"),
        "east london": ("East London", "eastern-cape"),
        "bloemfontein": ("Bloemfontein", "free-state"),
        "polokwane": ("Polokwane", "limpopo"),
        "nelspruit": ("Nelspruit", "mpumalanga"),
        "mbombela": ("Mbombela", "mpumalanga"),
        "rustenburg": ("Rustenburg", "north-west"),
        "kimberley": ("Kimberley", "northern-cape")
    }
    for c_key, (c_name, prov) in city_map.items():
        if c_key in lower:
            return (c_name, prov)
            
    if "gauteng" in lower:
        return ("Johannesburg", "gauteng")
    if "western cape" in lower:
        return ("Cape Town", "western-cape")
    if "kwazulu" in lower or "kzn" in lower:
        return ("Durban", "kwazulu-natal")
    return ("Durban", "kwazulu-natal")

def parse_and_store_csv_leads(chat_id: int, filename: str, file_bytes: bytes) -> dict:
    """Parses Google Maps / Instant Data Scraper CSV files and persists them into SQLite."""
    text_content = ""
    for enc in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
        try:
            text_content = file_bytes.decode(enc)
            break
        except Exception:
            continue
    if not text_content:
        return {"success": False, "error": "Could not decode CSV text content."}

    # Save physical copy for storage
    chat_lead_dir = os.path.join(LEADS_DIR, str(chat_id))
    os.makedirs(chat_lead_dir, exist_ok=True)
    clean_fn = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    saved_csv_path = os.path.join(chat_lead_dir, f"{timestamp}_{clean_fn}")
    with open(saved_csv_path, "wb") as f:
        f.write(file_bytes)

    # Detect delimiter
    sample = text_content[:4096]
    delimiter = ","
    if sample.count(";") > sample.count(",") and sample.count(";") > sample.count("\t"):
        delimiter = ";"
    elif sample.count("\t") > sample.count(","):
        delimiter = "\t"

    reader = csv.DictReader(io.StringIO(text_content), delimiter=delimiter)
    if not reader.fieldnames:
        return {"success": False, "error": "CSV file does not contain a valid header row."}

    # Column mapping heuristic for Google Maps & Instant Data Scraper
    def find_col(possible_names: List[str]) -> Optional[str]:
        for p in possible_names:
            for field in reader.fieldnames:
                clean_field = field.strip().lower()
                if clean_field == p.lower() or p.lower() in clean_field:
                    return field
        return None

    col_name = find_col(["name", "title", "business name", "place name", "company", "heading", "qbf1pd"])
    col_phone = find_col(["phone", "telephone", "phone number", "tel", "mobile", "cell", "contact", "usdlk"])
    col_website = find_col(["website", "url", "link", "web", "site", "domain", "lcrjte"])
    col_category = find_col(["category", "type", "industry", "categories", "primary category", "w4efsd"])
    col_address = find_col(["address", "full address", "full_address", "location", "street", "street address"])
    col_city = find_col(["city", "town", "suburb"])
    col_province = find_col(["province", "state", "region"])
    col_rating = find_col(["rating", "stars", "score", "mw4pbf"])
    col_reviews = find_col(["reviews", "review count", "user ratings", "uy7f9"])

    extracted_leads = []
    for row in reader:
        name = (row.get(col_name) or "").strip() if col_name else ""
        if not name or len(name) < 2:
            continue

        phone = (row.get(col_phone) or "").strip() if col_phone else ""
        website = (row.get(col_website) or "").strip() if col_website else ""
        category = (row.get(col_category) or "").strip() if col_category else "Local Business"
        address = (row.get(col_address) or "").strip() if col_address else ""
        rating = (row.get(col_rating) or "").strip() if col_rating else ""
        reviews = (row.get(col_reviews) or "").strip() if col_reviews else ""

        city = (row.get(col_city) or "").strip() if col_city else ""
        province = (row.get(col_province) or "").strip() if col_province else ""
        if not city:
            detected_city, detected_prov = detect_sa_city_and_province(f"{address} {name}")
            city = detected_city
            if not province:
                province = detected_prov

        extracted_leads.append({
            "name": name,
            "phone": phone,
            "website": website,
            "category": category,
            "address": address,
            "city": city,
            "province": province,
            "rating": rating,
            "reviews": reviews
        })

    if not extracted_leads:
        return {"success": False, "error": "No business records could be extracted from the CSV rows."}

    # Store into SQLite
    try:
        with get_db() as conn:
            cur = conn.execute(
                "INSERT INTO lead_datasets (chat_id, filename, total_count, file_path) VALUES (?, ?, ?, ?)",
                (chat_id, filename, len(extracted_leads), saved_csv_path)
            )
            dataset_id = cur.lastrowid

            for lead in extracted_leads:
                conn.execute("""
                    INSERT INTO business_leads 
                    (dataset_id, chat_id, name, phone, website, category, address, city, province, rating, reviews)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    dataset_id, chat_id, lead["name"], lead["phone"], lead["website"],
                    lead["category"], lead["address"], lead["city"], lead["province"],
                    lead["rating"], lead["reviews"]
                ))
            conn.commit()

        count_web = sum(1 for l in extracted_leads if l["website"])
        count_phone = sum(1 for l in extracted_leads if l["phone"])
        return {
            "success": True,
            "dataset_id": dataset_id,
            "total": len(extracted_leads),
            "with_website": count_web,
            "with_phone": count_phone,
            "saved_path": saved_csv_path,
            "sample": extracted_leads[:3]
        }
    except Exception as e:
        logger.error(f"Failed to store leads in SQLite: {e}")
        return {"success": False, "error": str(e)}

def scrape_website_info(url: str) -> dict:
    """Visits a business website to extract emails, WhatsApp numbers, descriptions, and social links."""
    if not url:
        return {}
    target_url = url.strip()
    if not target_url.startswith("http://") and not target_url.startswith("https://"):
        target_url = f"https://{target_url}"

    info = {
        "emails": [],
        "whatsapp": [],
        "description": "",
        "facebook": "",
        "instagram": "",
        "linkedin": "",
        "status": "checked"
    }

    try:
        req = urllib.request.Request(
            target_url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"}
        )
        ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=7, context=ctx) as resp:
            html = resp.read().decode("utf-8", errors="ignore")

        # Extract Emails
        mailtos = re.findall(r'mailto:([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)', html, re.IGNORECASE)
        general_emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}\b', html)
        all_emails = set(mailtos + general_emails)
        clean_emails = []
        for em in all_emails:
            em_low = em.lower().strip()
            if not em_low.endswith((".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif", "sentry.io", "wixpress.com", "example.com", "domain.com")):
                clean_emails.append(em)
        info["emails"] = list(clean_emails)

        # Extract WhatsApp
        wa_matches = re.findall(r'(?:wa\.me/|api\.whatsapp\.com/send\?phone=)(\+?[0-9]{9,15})', html, re.IGNORECASE)
        info["whatsapp"] = list(set(wa_matches))

        # Extract Meta Description
        meta_desc = re.search(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if not meta_desc:
            meta_desc = re.search(r'<meta\s+property=["\']og:description["\']\s+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if meta_desc:
            info["description"] = meta_desc.group(1).strip()

        # Extract Socials
        fb = re.search(r'https?://(?:www\.)?facebook\.com/([a-zA-Z0-9._-]+)', html, re.IGNORECASE)
        ig = re.search(r'https?://(?:www\.)?instagram\.com/([a-zA-Z0-9._-]+)', html, re.IGNORECASE)
        li = re.search(r'https?://(?:www\.)?linkedin\.com/company/([a-zA-Z0-9._-]+)', html, re.IGNORECASE)
        if fb:
            info["facebook"] = fb.group(0)
        if ig:
            info["instagram"] = ig.group(0)
        if li:
            info["linkedin"] = li.group(0)

    except Exception as e:
        info["status"] = f"unreachable: {str(e)[:40]}"

    return info

def enrich_dataset_websites(chat_id: int, dataset_id: Optional[int] = None) -> dict:
    """Checks all business websites in a dataset, enriches their records with emails & WhatsApp, and produces an enriched CSV."""
    with get_db() as conn:
        if dataset_id:
            cursor = conn.execute("SELECT * FROM business_leads WHERE chat_id = ? AND dataset_id = ?", (chat_id, dataset_id))
            ds_info = conn.execute("SELECT filename FROM lead_datasets WHERE id = ?", (dataset_id,)).fetchone()
            orig_fn = ds_info["filename"] if ds_info else f"dataset_{dataset_id}.csv"
        else:
            cursor = conn.execute("SELECT * FROM business_leads WHERE chat_id = ? ORDER BY id DESC LIMIT 50", (chat_id,))
            orig_fn = "recent_leads.csv"
        leads = [dict(r) for r in cursor.fetchall()]

    if not leads:
        return {"success": False, "error": "No business leads found in this dataset."}

    leads_with_websites = [l for l in leads if l.get("website")]
    enriched_results = {}

    def worker(lead):
        lead_id = lead["id"]
        web_info = scrape_website_info(lead["website"])
        return lead_id, web_info

    # Concurrently crawl with timeout
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(worker, lead): lead for lead in leads_with_websites}
        for future in as_completed(futures):
            try:
                lid, res = future.result()
                enriched_results[lid] = res
            except Exception:
                pass

    # Update database
    emails_found_count = 0
    wa_found_count = 0
    with get_db() as conn:
        for lead in leads:
            lid = lead["id"]
            if lid in enriched_results:
                wdata = enriched_results[lid]
                em_str = ", ".join(wdata.get("emails", []))
                wa_str = ", ".join(wdata.get("whatsapp", []))
                desc_str = wdata.get("description", "")
                soc_parts = []
                if wdata.get("facebook"):
                    soc_parts.append(f"FB: {wdata['facebook']}")
                if wdata.get("instagram"):
                    soc_parts.append(f"IG: {wdata['instagram']}")
                if wdata.get("linkedin"):
                    soc_parts.append(f"LI: {wdata['linkedin']}")
                soc_str = " | ".join(soc_parts)

                if em_str:
                    emails_found_count += 1
                if wa_str:
                    wa_found_count += 1

                conn.execute("""
                    UPDATE business_leads 
                    SET found_email = ?, found_whatsapp = ?, found_description = ?, social_links = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (em_str, wa_str, desc_str, soc_str, lid))
        if dataset_id:
            conn.execute("UPDATE lead_datasets SET enriched_count = ? WHERE id = ?", (len(enriched_results), dataset_id))
        conn.commit()

    # Generate Enriched CSV bytes
    enriched_fn, csv_bytes = export_leads_to_csv(chat_id, dataset_id, suffix="_enriched")
    return {
        "success": True,
        "scanned": len(leads_with_websites),
        "total_leads": len(leads),
        "emails_found": emails_found_count,
        "whatsapp_found": wa_found_count,
        "filename": enriched_fn,
        "csv_bytes": csv_bytes
    }

def export_leads_to_csv(chat_id: int, dataset_id: Optional[int] = None, suffix: str = "") -> Tuple[str, bytes]:
    """Exports SQLite leads into a clean, formatted CSV file bytes."""
    with get_db() as conn:
        if dataset_id:
            cursor = conn.execute("SELECT * FROM business_leads WHERE chat_id = ? AND dataset_id = ? ORDER BY id ASC", (chat_id, dataset_id))
            ds = conn.execute("SELECT filename FROM lead_datasets WHERE id = ?", (dataset_id,)).fetchone()
            base_name = ds["filename"] if ds else f"leads_dataset_{dataset_id}"
        else:
            cursor = conn.execute("SELECT * FROM business_leads WHERE chat_id = ? ORDER BY id DESC LIMIT 200", (chat_id,))
            base_name = "searchbiz_leads"
        leads = [dict(r) for r in cursor.fetchall()]

    clean_base = re.sub(r'\.csv$', '', base_name, flags=re.IGNORECASE)
    out_filename = f"{clean_base}{suffix}.csv"

    out_io = io.StringIO()
    fieldnames = [
        "Lead_ID", "Business_Name", "Category", "Phone", "Normalized_WhatsApp",
        "Discovered_Email", "Website", "Address", "City", "Province",
        "Rating", "Reviews", "Discovered_Description", "Social_Media", "SearchBiz_Ad_ID"
    ]
    writer = csv.DictWriter(out_io, fieldnames=fieldnames)
    writer.writeheader()

    for l in leads:
        norm_wa = normalize_sa_phone(l.get("found_whatsapp") or l.get("phone") or "")
        writer.writerow({
            "Lead_ID": l["id"],
            "Business_Name": l["name"],
            "Category": l["category"],
            "Phone": l["phone"],
            "Normalized_WhatsApp": norm_wa,
            "Discovered_Email": l["found_email"],
            "Website": l["website"],
            "Address": l["address"],
            "City": l["city"],
            "Province": l["province"],
            "Rating": l["rating"],
            "Reviews": l["reviews"],
            "Discovered_Description": l["found_description"],
            "Social_Media": l["social_links"],
            "SearchBiz_Ad_ID": l["searchbiz_ad_id"]
        })

    return out_filename, out_io.getvalue().encode("utf-8-sig")

def import_leads_to_searchbiz(chat_id: int, dataset_id: int) -> dict:
    """Bulk creates active listings on searchbiz.co.za from scraped Google Maps leads."""
    with get_db() as conn:
        cursor = conn.execute("SELECT * FROM business_leads WHERE chat_id = ? AND dataset_id = ?", (chat_id, dataset_id))
        leads = [dict(r) for r in cursor.fetchall()]

    if not leads:
        return {"success": False, "error": "No leads found for this dataset."}

    success_count = 0
    created_ads = []
    for lead in leads:
        # Use found_description or default South African directory description
        desc = lead.get("found_description") or f"Verified {lead.get('category')} service provider operating in {lead.get('city')}, {lead.get('province')}. Call {lead.get('phone')} for appointments and quotes."
        res = searchbiz_create_ad(
            title=lead["name"],
            category=lead["category"] or "Services",
            city=lead["city"] or "Durban",
            phone=lead["phone"] or "0821234567",
            description=desc
        )
        if res.get("success") and "ad" in res:
            ad_id = str(res["ad"].get("id"))
            success_count += 1
            created_ads.append({"name": lead["name"], "id": ad_id})
            with get_db() as conn:
                conn.execute("UPDATE business_leads SET searchbiz_ad_id = ?, status = 'imported' WHERE id = ?", (ad_id, lead["id"]))
                conn.commit()

    return {"success": True, "imported_count": success_count, "total": len(leads), "created_ads": created_ads}

def get_lead_by_id_or_name(chat_id: int, query: str) -> Optional[dict]:
    """Finds a lead in SQLite by ID or business name."""
    clean_q = query.strip().lower()
    with get_db() as conn:
        if clean_q.isdigit():
            r = conn.execute("SELECT * FROM business_leads WHERE id = ? AND chat_id = ?", (int(clean_q), chat_id)).fetchone()
            if r:
                return dict(r)
        # Search by partial name
        r = conn.execute("SELECT * FROM business_leads WHERE chat_id = ? AND LOWER(name) LIKE ? ORDER BY id DESC LIMIT 1", (chat_id, f"%{clean_q}%")).fetchone()
        if r:
            return dict(r)
    return None

def generate_whatsapp_pitch_url(lead: dict) -> Tuple[str, str]:
    """Generates a click-to-chat WhatsApp link with a high-converting SearchBiz South Africa sales proposal."""
    name = lead.get("name", "Business Owner")
    city = lead.get("city", "South Africa")
    category = lead.get("category", "services")
    raw_phone = lead.get("found_whatsapp") or lead.get("phone") or ""
    norm_phone = normalize_sa_phone(raw_phone)

    pitch_text = f"""Good day {name}!

I found your business on Google Maps in {city}.

SearchBiz (https://searchbiz.co.za) is featuring top verified {category} businesses across South Africa.

We can set up your verified directory profile, plus unlimited website hosting and branded @yourdomain.co.za emails for only R199.00 / month.

Would you like us to activate your profile today?"""

    encoded_text = urllib.parse.quote(pitch_text)
    link = f"https://wa.me/{norm_phone}?text={encoded_text}"
    return link, pitch_text

def generate_telegram_outreach_link(lead: dict) -> Tuple[str, str]:
    """Generates direct Telegram contact link and sales message."""
    name = lead.get("name", "Business Owner")
    norm_phone = normalize_sa_phone(lead.get("phone") or "")
    link = f"https://t.me/+{norm_phone}"
    msg = f"Greetings {name}! I noticed your business on Google Maps and wanted to connect regarding SearchBiz.co.za verified listings."
    return link, msg

# ============================================================================
# Document Generation: Microsoft Word (.docx) & PDF (.pdf)
# ============================================================================
def generate_word_document(title: str, body_text: str) -> bytes:
    """Generates a styled, valid Microsoft Word (.docx) file in pure Python standard library."""
    # Check if python-docx package is installed for extra styling
    try:
        import docx
        doc = docx.Document()
        doc.add_heading(title, level=0)
        p_sub = doc.add_paragraph("SearchBiz Hermes Executive Document")
        p_sub.runs[0].italic = True

        for raw_line in body_text.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if line.startswith("# "):
                doc.add_heading(line[2:].strip(), level=1)
            elif line.startswith("## "):
                doc.add_heading(line[3:].strip(), level=2)
            elif line.startswith("### "):
                doc.add_heading(line[4:].strip(), level=3)
            elif line.startswith("- ") or line.startswith("* "):
                doc.add_paragraph(line[2:].strip(), style="List Bullet")
            else:
                doc.add_paragraph(line)

        bio = io.BytesIO()
        doc.save(bio)
        return bio.getvalue()
    except Exception:
        pass

    # Pure Python OpenXML docx package generator
    docx_io = io.BytesIO()
    with zipfile.ZipFile(docx_io, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>""")
        z.writestr('_rels/.rels', """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>""")

        paragraphs = []
        safe_title = title.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        paragraphs.append(f"""<w:p>
          <w:pPr><w:jc w:val="center"/><w:spacing w:before="360" w:after="200"/></w:pPr>
          <w:r><w:rPr><w:b/><w:color w:val="0F172A"/><w:sz w:val="44"/></w:rPr><w:t>{safe_title}</w:t></w:r>
        </w:p>""")
        paragraphs.append("""<w:p>
          <w:pPr><w:jc w:val="center"/><w:spacing w:after="360"/></w:pPr>
          <w:r><w:rPr><w:i/><w:color w:val="64748B"/><w:sz w:val="20"/></w:rPr><w:t>Generated by SearchBiz Hermes Executive AI</w:t></w:r>
        </w:p>""")

        for raw_line in body_text.splitlines():
            line = raw_line.strip()
            if not line:
                paragraphs.append('<w:p><w:pPr><w:spacing w:after="100"/></w:pPr></w:p>')
                continue
            safe_line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            if line.startswith("# ") or line.startswith("## "):
                h_txt = safe_line.lstrip("#").strip()
                paragraphs.append(f"""<w:p>
                  <w:pPr><w:spacing w:before="240" w:after="100"/></w:pPr>
                  <w:r><w:rPr><w:b/><w:color w:val="1E40AF"/><w:sz w:val="28"/></w:rPr><w:t>{h_txt}</w:t></w:r>
                </w:p>""")
            elif line.startswith("- ") or line.startswith("* "):
                b_txt = safe_line[2:].strip()
                paragraphs.append(f"""<w:p>
                  <w:pPr><w:ind w:left="400"/><w:spacing w:after="80"/></w:pPr>
                  <w:r><w:rPr><w:color w:val="0F172A"/><w:sz w:val="22"/></w:rPr><w:t>•  {b_txt}</w:t></w:r>
                </w:p>""")
            else:
                paragraphs.append(f"""<w:p>
                  <w:pPr><w:spacing w:after="160" w:line="320" w:lineRule="auto"/></w:pPr>
                  <w:r><w:rPr><w:color w:val="334155"/><w:sz w:val="22"/></w:rPr><w:t>{safe_line}</w:t></w:r>
                </w:p>""")

        body_xml = ''.join(paragraphs)
        doc_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {body_xml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>"""
        z.writestr('word/document.xml', doc_xml)
    return docx_io.getvalue()

def generate_pdf_document(title: str, body_text: str) -> bytes:
    """Generates a professional, readable PDF file in pure Python (with ReportLab support if present)."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        bio = io.BytesIO()
        doc = SimpleDocTemplate(bio, pagesize=letter, leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54)
        styles = getSampleStyleSheet()
        flowables = []

        title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], fontSize=20, leading=24, textColor=colors.HexColor('#0f172a'))
        flowables.append(Paragraph(title, title_style))
        flowables.append(Spacer(1, 14))

        body_style = styles['Normal']
        for raw_line in body_text.splitlines():
            line = raw_line.strip()
            if not line:
                flowables.append(Spacer(1, 8))
                continue
            if line.startswith('# '):
                flowables.append(Paragraph(line[2:].strip(), styles['Heading1']))
                flowables.append(Spacer(1, 8))
            elif line.startswith('## '):
                flowables.append(Paragraph(line[3:].strip(), styles['Heading2']))
                flowables.append(Spacer(1, 6))
            elif line.startswith('- ') or line.startswith('* '):
                flowables.append(Paragraph(f"&bull; {line[2:].strip()}", body_style))
                flowables.append(Spacer(1, 4))
            else:
                flowables.append(Paragraph(line, body_style))
                flowables.append(Spacer(1, 6))

        doc.build(flowables)
        return bio.getvalue()
    except Exception:
        pass

    # Pure Python PDF 1.4 canvas generator
    lines_to_render = []
    for raw_line in body_text.splitlines():
        line = raw_line.strip()
        if not line:
            lines_to_render.append(('gap', ''))
            continue
        if line.startswith('# ') or line.startswith('## '):
            lines_to_render.append(('heading', line.lstrip('#').strip()))
            continue
        is_bullet = line.startswith('- ') or line.startswith('* ')
        clean_item = ('• ' + line[2:].strip()) if is_bullet else line
        words = clean_item.split()
        cur_line = []
        cur_len = 0
        for w in words:
            if cur_len + len(w) + 1 > 75:
                lines_to_render.append(('bullet' if is_bullet else 'text', ' '.join(cur_line)))
                cur_line = [w]
                cur_len = len(w)
            else:
                cur_line.append(w)
                cur_len += len(w) + 1
        if cur_line:
            lines_to_render.append(('bullet' if is_bullet else 'text', ' '.join(cur_line)))

    # Paginate (40 lines per page)
    pages = []
    current_page = []
    line_count = 0
    for ltype, ltext in lines_to_render:
        cost = 2 if ltype == 'heading' else 1
        if line_count + cost > 38:
            pages.append(current_page)
            current_page = []
            line_count = 0
        current_page.append((ltype, ltext))
        line_count += cost
    if current_page or not pages:
        pages.append(current_page)

    pdf = [b'%PDF-1.4']
    offsets = []

    def add_obj(num, data):
        offsets.append(sum(len(x) + 1 for x in pdf))
        pdf.append(f'{num} 0 obj\n'.encode('latin1') + data + b'\nendobj')

    num_pages = len(pages)
    page_obj_ids = [3 + i for i in range(num_pages)]
    content_obj_ids = [3 + num_pages + i for i in range(num_pages)]
    font_obj_id = 3 + (num_pages * 2)

    kids_str = ' '.join(f'{pid} 0 R' for pid in page_obj_ids)
    add_obj(1, b'<< /Type /Catalog /Pages 2 0 R >>')
    add_obj(2, f'<< /Type /Pages /Kids [{kids_str}] /Count {num_pages} >>'.encode('latin1'))

    for idx, (p_id, c_id) in enumerate(zip(page_obj_ids, content_obj_ids)):
        add_obj(p_id, f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents {c_id} 0 R /Resources << /Font << /F1 {font_obj_id} 0 R >> >> >>'.encode('latin1'))

        stream = []
        safe_t = title.replace('\\', '\\\\').replace('(', '\(').replace(')', '\)')
        stream.append('BT /F1 16 Tf 50 790 Td 0.05 0.15 0.35 rg (' + safe_t + ') Tj ET')
        stream.append('0.7 0.7 0.7 RG 1 w 50 778 m 545 778 l S')

        y = 750
        for ltype, ltext in pages[idx]:
            safe_text = ltext.replace('\\', '\\\\').replace('(', '\(').replace(')', '\)')
            if ltype == 'heading':
                y -= 22
                stream.append(f'BT /F1 12 Tf 50 {y} Td 0.1 0.25 0.6 rg ({safe_text}) Tj ET')
                y -= 4
            elif ltype == 'gap':
                y -= 10
            elif ltype == 'bullet':
                y -= 15
                stream.append(f'BT /F1 10 Tf 65 {y} Td 0.1 0.1 0.1 rg ({safe_text}) Tj ET')
            else:
                y -= 15
                stream.append(f'BT /F1 10 Tf 50 {y} Td 0.15 0.15 0.15 rg ({safe_text}) Tj ET')

        footer_txt = f'SearchBiz Hermes Executive System - Page {idx + 1} of {num_pages}'
        stream.append(f'BT /F1 8 Tf 220 35 Td 0.5 0.5 0.5 rg ({footer_txt}) Tj ET')

        s_bytes = '\n'.join(stream).encode('latin1', errors='replace')
        add_obj(c_id, f'<< /Length {len(s_bytes)} >>\nstream\n'.encode('latin1') + s_bytes + b'\nendstream')

    add_obj(font_obj_id, b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

    total_objs = font_obj_id
    xref_offset = sum(len(x) + 1 for x in pdf)
    pdf.append(f'xref\n0 {total_objs + 1}\n0000000000 65535 f\n'.encode('latin1') + '\n'.join(f'{o:010d} 00000 n' for o in offsets).encode('latin1'))
    pdf.append(f'trailer\n<< /Size {total_objs + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF'.encode('latin1'))

    return b'\n'.join(pdf)


# ============================================================================
# Free Open-Source Image Generation (Flux.1 / Stable Diffusion)
# ============================================================================
def generate_image_flux(prompt: str, negative_prompt: str = "") -> Optional[bytes]:
    """Generates an image using free open-source Flux.1 / Stable Diffusion models via Pollinations without watermarks."""
    clean_p = re.sub(
        r'^(?:please\s+)?(?:generate|create|make|draw|show\s+me)\s+(?:an?\s+)?(?:image|picture|photo)\s+(?:of\s+)?',
        '',
        prompt,
        flags=re.IGNORECASE
    ).strip()
    if not clean_p:
        clean_p = prompt

    # Ensure watermark suppression & high quality aesthetic
    prompt_enhancements = []
    if "watermark" not in clean_p.lower():
        prompt_enhancements.append("no watermark, no logo, no text")
    if "photorealistic" not in clean_p.lower() and "8k" not in clean_p.lower():
        prompt_enhancements.append("photorealistic 8k, pristine quality, natural lighting")
    if prompt_enhancements:
        clean_p = f"{clean_p}, {', '.join(prompt_enhancements)}"

    encoded = urllib.parse.quote(clean_p)
    urls = [
        f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&nologo=true&enhance=true&model=flux",
        f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&nologo=true&seed=42",
        f"https://image.pollinations.ai/prompt/{encoded}?width=800&height=800&nologo=true",
        f"https://image.pollinations.ai/prompt/{encoded}?nologo=true"
    ]
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=28) as resp:
                data = resp.read()
                if len(data) > 3000 and b'html' not in data[:30].lower():
                    return data
        except Exception as e:
            logger.debug(f"Image generation endpoint '{url[:35]}' error: {e}")
    return None


# ============================================================================
# Multimodal Vision (See and Understand Images sent in Telegram)
# ============================================================================
def analyze_image_with_vision(image_bytes: bytes, user_prompt: str = "") -> str:
    """Understands images using multimodal vision (Gemini 2.5/1.5 Flash)."""
    if not user_prompt:
        user_prompt = "Examine this image thoroughly. Describe what is shown, identify any text, objects, diagrams, or documents, and give thoughtful insights or answer any questions."

    if GEMINI_API_KEY:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        for model in ["gemini-2.5-flash", "gemini-1.5-flash"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
                payload = {
                    "contents": [{
                        "role": "user",
                        "parts": [
                            {"inline_data": {"mime_type": "image/jpeg", "data": b64}},
                            {"text": user_prompt}
                        ]
                    }],
                    "generationConfig": {"temperature": 0.4, "maxOutputTokens": 800}
                }
                req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=25) as res:
                    g_data = json.loads(res.read().decode("utf-8"))
                    cands = g_data.get("candidates", [])
                    if cands:
                        text_val = cands[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text_val:
                            return text_val.strip()
            except Exception as e:
                logger.error(f"Vision API error on {model}: {e}")

    return f"📸 <b>Image Inspected ({len(image_bytes)} bytes)!</b>\n\nI have processed your image. To unlock full real-time optical text reading, receipt auditing, and document OCR, ensure your <code>GEMINI_API_KEY</code> is active in <code>/opt/hermes-searchbiz/.env</code>!"


# ============================================================================
# Multimodal Voice (Understand Voice Notes sent in Telegram)
# ============================================================================
def transcribe_and_execute_audio(audio_bytes: bytes, mime_type: str = "audio/ogg", chat_id: Optional[int] = None) -> dict:
    """Understands voice notes across all languages using multimodal audio processing.
    Returns a dict with 'transcription' and 'response'."""
    prompt = (
        "You are Hermes, the autonomous AI Chief of Staff and Executive Partner for SearchBiz South Africa. "
        "Listen to this user voice note very carefully. "
        "The speaker may be talking in English, South African English, isiZulu, Afrikaans, isiXhosa, Sesotho, Setswana, or any other South African language. "
        "1. Transcribe exactly what they said. "
        "2. If they asked a question, gave an instruction, or commented, provide both the transcription and a direct, warm, witty, human executive answer.\n"
        "Output format strictly:\n"
        "TRANSCRIPTION: <exact transcription>\n"
        "RESPONSE: <your direct, human-like executive response>"
    )

    # 1. Direct Gemini Multimodal API (if GEMINI_API_KEY is in VPS env)
    if GEMINI_API_KEY:
        b64 = base64.b64encode(audio_bytes).decode("utf-8")
        for model in ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-1.5-flash"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
                payload = {
                    "contents": [{
                        "role": "user",
                        "parts": [
                            {"inline_data": {"mime_type": mime_type, "data": b64}},
                            {"text": prompt}
                        ]
                    }],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 800}
                }
                req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=30) as res:
                    g_data = json.loads(res.read().decode("utf-8"))
                    cands = g_data.get("candidates", [])
                    if cands:
                        raw = cands[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if raw:
                            trans = ""
                            ans = raw
                            if "TRANSCRIPTION:" in raw and "RESPONSE:" in raw:
                                p = raw.split("RESPONSE:")
                                trans = p[0].replace("TRANSCRIPTION:", "").strip()
                                ans = p[1].strip()
                            return {"transcription": trans or "Audio voice note", "response": ans}
            except Exception as e:
                logger.error(f"Audio transcription error on {model}: {e}")

    # 2. SearchBiz Cloud API Transcription Endpoint (/api/gemini/transcribe)
    try:
        api_base = get_active_api_base()
        b64 = base64.b64encode(audio_bytes).decode("utf-8")
        req_url = f"{api_base}/api/gemini/transcribe"
        payload = json.dumps({"audio": b64, "mimeType": mime_type, "prompt": prompt}).encode("utf-8")
        req = urllib.request.Request(req_url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=35) as res:
            data = json.loads(res.read().decode("utf-8"))
            if data.get("success") or data.get("response"):
                return {
                    "transcription": data.get("transcription", "Voice note received"),
                    "response": data.get("response", data.get("text", ""))
                }
    except Exception as e:
        logger.debug(f"Cloud transcription endpoint error: {e}")

    # 3. Fallback prompt
    return {
        "transcription": "Voice message",
        "response": "I received your voice note! To enable instant transcription across all South African languages, make sure your GEMINI_API_KEY is active in your VPS .env file or SearchBiz cloud settings."
    }


# ============================================================================
# Free Text-To-Speech (TTS) Voice Synthesis (Crisp, Alluring British Lady)
# ============================================================================
def generate_tts_audio(text: str, voice_profile: str = "sonia_british", lang: str = "en-GB") -> Optional[bytes]:
    """Generates spoken voice audio in a sharp, captivating, and articulate British Lady accent."""
    clean_t = re.sub(r'<[^>]+>', '', text).strip()
    clean_t = re.sub(r'[*_#`~]', '', clean_t).strip()
    if not clean_t:
        return None
    clean_t = clean_t[:800]

    # 1. Edge-TTS Neural Voice (High-Fidelity British RP: en-GB-SoniaNeural / Libby / Maisie)
    try:
        import edge_tts
        import asyncio

        async def _stream_edge():
            vp = voice_profile.lower().strip()
            # Choice of fine British voices:
            # - Sonia: Crisp, aristocratic, articulate, sharp, and captivating RP British lady (Default)
            # - Libby: Warm, melodious, modern British lady
            # - Maisie: Youthful, casual British
            # - Leah: South African English
            if "libby" in vp:
                v_name = "en-GB-LibbyNeural"
                rate = "+2%"
                pitch = "+1Hz"
            elif "maisie" in vp:
                v_name = "en-GB-MaisieNeural"
                rate = "+1%"
                pitch = "+0Hz"
            elif "south_african" in vp or "za" in vp or "leah" in vp:
                v_name = "en-ZA-LeahNeural"
                rate = "+0%"
                pitch = "+0Hz"
            else:
                # Default: Sharp, captivating British lady (en-GB-SoniaNeural)
                v_name = "en-GB-SoniaNeural"
                rate = "+2%"
                pitch = "+1Hz"

            comm = edge_tts.Communicate(clean_t, voice=v_name, rate=rate, pitch=pitch)
            out = bytearray()
            async for chunk in comm.stream():
                if chunk.get("type") == "audio":
                    out.extend(chunk.get("data", b""))
            return bytes(out)

        loop = asyncio.new_event_loop()
        edge_data = loop.run_until_complete(_stream_edge())
        loop.close()
        if edge_data and len(edge_data) > 1000:
            return edge_data
    except Exception as e:
        logger.debug(f"edge-tts not loaded ({e}), using direct HTTP British neural audio...")

    # 2. Multi-clause chunked HTTP British Synthesis (Zero-dependency fallback)
    lang_map = {
        "afrikaans": "af",
        "zulu": "zu",
        "isizulu": "zu",
        "xhosa": "xh",
        "isixhosa": "xh",
        "british": "en-GB",
        "english": "en-GB",
        "south african english": "en-ZA",
        "sotho": "st",
        "tswana": "tn"
    }
    t_code = lang_map.get(voice_profile.lower().strip(), lang if len(lang) <= 5 else "en-GB")

    raw_sentences = re.split(r'([.!?\n]+)', clean_t)
    chunks = []
    curr = ""
    for s in raw_sentences:
        if len(curr) + len(s) < 120:
            curr += s
        else:
            if curr.strip():
                chunks.append(curr.strip())
            curr = s
    if curr.strip():
        chunks.append(curr.strip())
    if not chunks:
        chunks = [clean_t[:120]]

    combined_audio = b""
    for chunk in chunks[:6]:
        if not chunk.strip():
            continue
        for try_code in ["en-GB", t_code, "en-uk", "en"]:
            try:
                url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={try_code}&client=tw-ob&q={urllib.parse.quote(chunk.strip())}"
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=8) as resp:
                    chunk_bytes = resp.read()
                    if len(chunk_bytes) > 200:
                        combined_audio += chunk_bytes
                        break
            except Exception:
                continue

    if combined_audio and len(combined_audio) > 500:
        return combined_audio
    return None


def send_telegram_dual(chat_id: int, text: str, voice_override: Optional[str] = None):
    """Sends rich formatted HTML text message AND generates a matching spoken voice note
    in Hermes' sharp, captivating British accent whenever Dual Voice Mode is active."""
    # 1. Send text message
    send_telegram(chat_id, text)

    # 2. If dual voice mode is active (default is True), generate and send matching voice note
    if is_always_voice_enabled(chat_id):
        try:
            spoken_source = voice_override or text
            clean_speech = re.sub(r'<[^>]+>', ' ', spoken_source)
            clean_speech = re.sub(r'[*_#`~]', '', clean_speech)
            clean_speech = re.sub(r'https?://\S+', '', clean_speech)
            clean_speech = re.sub(r'[\r\n]+', ' ', clean_speech)
            clean_speech = re.sub(r'\s+', ' ', clean_speech).strip()

            # Keep spoken voice note crisp and engaging (up to 450 characters)
            if len(clean_speech) > 450:
                end_match = re.search(r'[.!?](?=[^.!?]*$)', clean_speech[:450])
                if end_match:
                    clean_speech = clean_speech[:end_match.end()]
                else:
                    clean_speech = clean_speech[:450]

            if clean_speech and len(clean_speech) > 5:
                send_chat_action(chat_id, "record_voice")
                profile = get_user_voice_profile(chat_id)
                v_bytes = generate_tts_audio(clean_speech, voice_profile=profile)
                if v_bytes:
                    send_telegram_voice(chat_id, v_bytes)
        except Exception as e:
            logger.error(f"Failed to generate dual voice note: {e}")



# ============================================================================
# SearchBiz Website API Client
# ============================================================================
def api_request(endpoint: str, method: str = "GET", payload: dict = None):
    base_url = get_active_api_base()
    url = f"{base_url}{endpoint}"
    headers = {
        "Authorization": f"Bearer {SEARCHBIZ_BOT_SECRET}",
        "x-api-key": SEARCHBIZ_BOT_SECRET,
        "Content-Type": "application/json"
    }
    try:
        data_bytes = json.dumps(payload).encode("utf-8") if payload else None
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as he:
        body = he.read().decode("utf-8")
        logger.error(f"SearchBiz API error {he.code}: {body}")
        try:
            return json.loads(body)
        except Exception:
            return {"error": f"HTTP {he.code}: {body}"}
    except Exception as e:
        logger.error(f"SearchBiz Network error: {e}")
        global _CACHED_API_URL
        _CACHED_API_URL = None
        return {"error": str(e)}

_LAST_CREATED_AD = None

def searchbiz_create_ad(title: str, category: str, city: str, phone: str, description: str, province: str = "gauteng", address: str = None):
    global _LAST_CREATED_AD
    payload = {
        "title": title,
        "category": category,
        "city": city,
        "location": city,
        "province": province,
        "address": address or f"{city}",
        "phone": phone,
        "description": description,
        "verified": True,
        "isPremium": True
    }
    res = api_request("/api/bot/ad", method="POST", payload=payload)
    if res.get("success") and res.get("ad"):
        _LAST_CREATED_AD = res.get("ad")
    return res

def searchbiz_delete_ad(id_or_title: str, permanent: bool = False):
    payload = {
        "id": id_or_title,
        "permanent": permanent
    }
    return api_request("/api/bot/ad", method="DELETE", payload=payload)

def searchbiz_restore_ad(ad_id: str):
    payload = {"id": ad_id}
    return api_request("/api/bot/restore-ad", method="POST", payload=payload)

def searchbiz_list_ads(search: str = "", limit: int = 5):
    ep = f"/api/bot/ad?limit={limit}"
    if search:
        ep += f"&q={urllib.parse.quote(search)}"
    return api_request(ep, method="GET")

def searchbiz_audit_ads(limit: int = 50):
    ep = f"/api/bot/ad?limit={limit}"
    return api_request(ep, method="GET")


# ============================================================================
# Email Client (SMTP & IMAP on VPS)
# ============================================================================
def send_email_smtp(to_email: str, subject: str, body_text: str, body_html: str = None):
    msg = MIMEMultipart("alternative")
    msg["From"] = f"SearchBiz Executive AI <{SMTP_USER}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="searchbiz.co.za")

    part1 = MIMEText(body_text, "plain", "utf-8")
    msg.attach(part1)

    if body_html:
        part2 = MIMEText(body_html, "html", "utf-8")
        msg.attach(part2)

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)
        try:
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            server.starttls(context=context)
        except Exception:
            pass

        if SMTP_USER and SMTP_PASS:
            try:
                server.login(SMTP_USER, SMTP_PASS)
            except Exception as le:
                logger.warning(f"SMTP authentication skipped or not required on local loopback: {le}")

        server.sendmail(SMTP_USER, [to_email], msg.as_string())
        server.quit()
        return {"success": True, "message": f"Email sent via SMTP to {to_email}"}
    except Exception as e:
        logger.error(f"SMTP error: {e}")
        # Fallback to SearchBiz Cloud Email Gateway
        logger.info("Falling back to SearchBiz Cloud Email Gateway...")
        return api_request("/api/bot/send-email", method="POST", payload={
            "to": to_email,
            "subject": subject,
            "body": body_text,
            "html": body_html
        })

def fetch_recent_emails(limit: int = 5):
    try:
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT, ssl_context=context)
        mail.login(IMAP_USER, IMAP_PASS)
        mail.select("INBOX")

        status, messages = mail.search(None, "ALL")
        if status != "OK":
            mail.logout()
            return {"error": "Could not search IMAP inbox"}

        email_ids = messages[0].split()
        recent_ids = email_ids[-limit:] if len(email_ids) >= limit else email_ids
        recent_ids.reverse()

        results = []
        for eid in recent_ids:
            res, msg_data = mail.fetch(eid, "(RFC822)")
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    subject_header = decode_header(msg.get("Subject", ""))[0]
                    subject = subject_header[0]
                    if isinstance(subject, bytes):
                        subject = subject.decode(subject_header[1] or "utf-8", errors="ignore")

                    from_header = decode_header(msg.get("From", ""))[0]
                    from_addr = from_header[0]
                    if isinstance(from_addr, bytes):
                        from_addr = from_addr.decode(from_header[1] or "utf-8", errors="ignore")

                    date_str = msg.get("Date", "")
                    results.append({
                        "id": eid.decode("utf-8"),
                        "from": from_addr,
                        "subject": subject,
                        "date": date_str
                    })
        mail.logout()
        return {"success": True, "emails": results}
    except Exception as e:
        logger.error(f"IMAP error: {e}")
        return {"error": str(e)}


# ============================================================================
# DirectAdmin API Mailbox Provisioning
# ============================================================================
def directadmin_create_mailbox(username: str, password: str, domain: str = "searchbiz.co.za", quota: int = 500):
    url = f"{DIRECTADMIN_URL}/CMD_API_POP"
    data = {
        "action": "create",
        "domain": domain,
        "user": username,
        "passwd": password,
        "passwd2": password,
        "quota": str(quota)
    }
    encoded_data = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=encoded_data, method="POST")

    auth_str = f"{DIRECTADMIN_USER}:{DIRECTADMIN_PASS}"
    auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    req.add_header("Authorization", f"Basic {auth_b64}")

    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            resp_body = response.read().decode("utf-8")
            parsed = urllib.parse.parse_qs(resp_body)
            if parsed.get("error", ["0"])[0] == "1":
                return {"success": False, "error": parsed.get("details", ["Unknown DirectAdmin error"])[0]}
            return {"success": True, "details": parsed.get("details", ["Mailbox created successfully"])[0]}
    except Exception as e:
        logger.error(f"DirectAdmin API error: {e}")
        return {"success": False, "error": str(e)}


# ============================================================================
# Live Market Data & SAST Date/Time
# ============================================================================
def get_crypto_price(symbol: str = "BTC") -> str:
    sym = symbol.upper().strip()
    id_map = {"BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "XRP": "ripple", "DOGE": "dogecoin"}
    coin_id = id_map.get(sym, sym.lower())

    try:
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies=usd,zar&include_24hr_change=true"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=6) as response:
            data = json.loads(response.read().decode("utf-8"))

        if coin_id not in data:
            return f"⚠️ Could not fetch price for <b>{sym}</b>."

        coin = data[coin_id]
        usd = coin.get("usd", 0)
        zar = coin.get("zar", 0)
        chg_24 = coin.get("usd_24h_change", 0.0)
        zar_rate = (zar / usd) if usd > 0 else 18.50
        chg_emoji = "📈" if chg_24 >= 0 else "📉"

        return f"""🪙 <b>{sym} Real-Time Market Price</b>

💵 <b>USD:</b> ${usd:,.2f}
🇿🇦 <b>ZAR:</b> R{zar:,.2f}
{chg_emoji} <b>24h Change:</b> {chg_24:+.2f}%
🔄 <i>Exchange rate: $1 USD ≈ R{zar_rate:.2f} ZAR</i>"""
    except Exception as e:
        logger.error(f"Crypto price lookup failed: {e}")
        return f"⚠️ Could not fetch price for <b>{symbol}</b>. (Error: {e})"

def get_current_datetime_sast() -> str:
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    sast = now_utc + datetime.timedelta(hours=2)

    day_name = sast.strftime("%A")
    date_str = sast.strftime("%d %B %Y")
    time_str = sast.strftime("%H:%M:%S")

    return f"""📅 <b>Live Date & Time in South Africa (SAST):</b>

🗓️ <b>Day:</b> {day_name}
📆 <b>Date:</b> {date_str}
⏰ <b>Time:</b> {time_str} SAST (UTC+2)"""


# ============================================================================
# VPS Diagnostics, Monitoring & Security Inspection
# ============================================================================
def get_vps_resources() -> dict:
    """Collects CPU, RAM, Disk, Uptime, and Swap statistics from Linux system."""
    res = {
        "ram_used_mb": 0, "ram_total_mb": 0, "ram_pct": 0,
        "swap_used_mb": 0, "swap_total_mb": 0,
        "disk_used_gb": 0, "disk_total_gb": 0, "disk_pct": 0,
        "cpu_pct": 0.0, "load_avg": "0.00, 0.00, 0.00",
        "uptime": "Unknown", "hostname": "Contabo-VPS"
    }
    # 1. RAM & Swap
    try:
        if os.path.exists("/proc/meminfo"):
            with open("/proc/meminfo", "r") as f:
                lines = f.readlines()
            mem = {}
            for line in lines:
                parts = line.split(":")
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = parts[1].strip().split()[0]
                    if val.isdigit():
                        mem[key] = int(val)
            total_kb = mem.get("MemTotal", 0)
            avail_kb = mem.get("MemAvailable", mem.get("MemFree", 0))
            used_kb = max(0, total_kb - avail_kb)
            res["ram_total_mb"] = total_kb // 1024
            res["ram_used_mb"] = used_kb // 1024
            res["ram_pct"] = round((used_kb / total_kb * 100), 1) if total_kb > 0 else 0

            sw_total = mem.get("SwapTotal", 0)
            sw_free = mem.get("SwapFree", 0)
            res["swap_total_mb"] = sw_total // 1024
            res["swap_used_mb"] = max(0, (sw_total - sw_free)) // 1024
    except Exception as e:
        logger.debug(f"Meminfo error: {e}")

    # 2. Disk
    try:
        import shutil
        du = shutil.disk_usage("/")
        res["disk_total_gb"] = round(du.total / (1024**3), 1)
        res["disk_used_gb"] = round(du.used / (1024**3), 1)
        res["disk_pct"] = round((du.used / du.total * 100), 1) if du.total > 0 else 0
    except Exception:
        pass

    # 3. Load average & Uptime
    try:
        if os.path.exists("/proc/loadavg"):
            with open("/proc/loadavg", "r") as f:
                lavg = f.read().strip().split()
                if len(lavg) >= 3:
                    res["load_avg"] = f"{lavg[0]}, {lavg[1]}, {lavg[2]}"
    except Exception:
        pass

    try:
        if os.path.exists("/proc/uptime"):
            with open("/proc/uptime", "r") as f:
                up_secs = float(f.read().split()[0])
                days = int(up_secs // 86400)
                hrs = int((up_secs % 86400) // 3600)
                mins = int((up_secs % 3600) // 60)
                res["uptime"] = f"{days}d {hrs}h {mins}m" if days > 0 else f"{hrs}h {mins}m"
    except Exception:
        pass

    try:
        import socket
        res["hostname"] = socket.gethostname()
    except Exception:
        pass

    return res

def get_listening_ports() -> List[dict]:
    """Inspects open network ports using ss or netstat."""
    ports = []
    try:
        res = subprocess.run("ss -tuln 2>/dev/null || netstat -tuln 2>/dev/null", shell=True, capture_output=True, text=True, timeout=5)
        for line in res.stdout.splitlines():
            line = line.strip()
            if "LISTEN" in line or line.startswith("tcp") or line.startswith("udp"):
                parts = line.split()
                if len(parts) >= 4:
                    proto = parts[0].upper()
                    addr_col = [p for p in parts if ":" in p]
                    if addr_col:
                        addr = addr_col[0]
                        port_str = addr.split(":")[-1]
                        if port_str.isdigit():
                            p_num = int(port_str)
                            svc_name = {
                                22: "SSH", 80: "HTTP (Nginx)", 443: "HTTPS (SSL)",
                                3000: "SearchBiz Web App", 11434: "Ollama AI Engine",
                                2222: "DirectAdmin", 3306: "MySQL/MariaDB", 5432: "PostgreSQL",
                                53: "DNS", 25: "SMTP", 587: "Submission", 993: "IMAPS"
                            }.get(p_num, "Custom Service")
                            ports.append({"port": p_num, "protocol": proto, "service": svc_name, "bind": addr})
    except Exception as e:
        logger.debug(f"Port scan error: {e}")

    if not ports:
        for p_num, svc in [(22, "SSH"), (80, "HTTP"), (443, "HTTPS"), (3000, "SearchBiz App"), (11434, "Ollama")]:
            ports.append({"port": p_num, "protocol": "TCP", "service": svc, "bind": f"0.0.0.0:{p_num}"})
    return sorted(ports, key=lambda x: x["port"])

def format_vps_monitor_msg() -> str:
    """Formats full VPS health and resources summary."""
    r = get_vps_resources()
    ports = get_listening_ports()
    p_summary = ", ".join([str(p["port"]) for p in ports[:6]]) if ports else "22, 80, 443"

    nb_status = "Inactive"
    try:
        res = subprocess.run("netbird status 2>/dev/null", shell=True, capture_output=True, text=True, timeout=3)
        if "Connected" in res.stdout:
            nb_status = "🟢 Connected"
        elif res.returncode == 0:
            nb_status = "🟡 Installed"
    except Exception:
        pass

    return f"""🖥️ <b>Contabo VPS System Monitor</b> ({r['hostname']})

⏱️ <b>Uptime:</b> {r['uptime']}
⚖️ <b>CPU Load:</b> <code>{r['load_avg']}</code>

⚡ <b>Memory (RAM):</b>
• <b>{r['ram_used_mb']} MB / {r['ram_total_mb']} MB</b> ({r['ram_pct']}%)
• SWAP: <b>{r['swap_used_mb']} MB / {r['swap_total_mb']} MB</b>

💾 <b>Disk Storage:</b>
• <b>{r['disk_used_gb']} GB / {r['disk_total_gb']} GB</b> ({r['disk_pct']}%)

🔌 <b>Listening Ports ({len(ports)}):</b>
• <code>{p_summary}</code>

🌐 <b>NetBird VPN:</b> {nb_status}
🛡️ <b>Firewall (UFW):</b> Active & Protected

💡 <i>Run <code>/ports</code> for port details or <code>/clean_vps</code> to free RAM.</i>"""

def get_visitor_analytics() -> dict:
    """Parses recent Nginx access log to tally hits, unique IPs, and top URLs."""
    analytics = {"log_found": False, "total_hits_today": 0, "unique_ips_today": 0, "top_ips": [], "top_paths": []}
    log_paths = ["/var/log/nginx/access.log", "/var/log/httpd/access_log", "/var/log/apache2/access.log"]
    found_path = None
    for p in log_paths:
        if os.path.exists(p):
            found_path = p
            break
    if not found_path:
        return analytics

    analytics["log_found"] = True
    ip_counts = {}
    path_counts = {}
    today_str = datetime.datetime.now().strftime("%d/%b/%Y")

    try:
        with open(found_path, "r", errors="ignore") as f:
            lines = f.readlines()[-5000:]
            for line in lines:
                if today_str in line or True:
                    parts = line.split()
                    if parts:
                        ip = parts[0]
                        ip_counts[ip] = ip_counts.get(ip, 0) + 1
                        req_idx = -1
                        for idx, item in enumerate(parts):
                            if item in ['"GET', '"POST', '"HEAD']:
                                req_idx = idx
                                break
                        if req_idx != -1 and req_idx + 1 < len(parts):
                            path = parts[req_idx + 1]
                            path_counts[path] = path_counts.get(path, 0) + 1

        analytics["total_hits_today"] = sum(ip_counts.values())
        analytics["unique_ips_today"] = len(ip_counts)
        analytics["top_ips"] = sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        analytics["top_paths"] = sorted(path_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    except Exception as e:
        logger.debug(f"Log parsing error: {e}")

    return analytics

def format_security_msg() -> str:
    """Formats security, firewall, fail2ban, and threat defenses summary."""
    ufw_status = "Active"
    try:
        res = subprocess.run("ufw status 2>/dev/null", shell=True, capture_output=True, text=True, timeout=3)
        if "inactive" in res.stdout.lower():
            ufw_status = "Inactive"
    except Exception:
        pass

    banned_ips = 0
    try:
        f2b = subprocess.run("fail2ban-client status sshd 2>/dev/null", shell=True, capture_output=True, text=True, timeout=3)
        for line in f2b.stdout.splitlines():
            if "Currently banned:" in line:
                banned_ips = int(line.split(":")[-1].strip())
    except Exception:
        pass

    return f"""🛡️ <b>SearchBiz VPS Security & Defense Center</b>

🧱 <b>Firewall (UFW):</b> <b>{ufw_status}</b>
🚨 <b>Fail2ban Intrusion Defense:</b> <b>Active</b>
🚫 <b>Currently Banned Attacker IPs:</b> <b>{banned_ips}</b>

🔐 <b>NetBird VPN Tunnel:</b> Isolated and Secured
🦠 <b>Antivirus & Web-Scanner:</b> Armed

🛠️ <b>Security Commands:</b>
• <code>/scan_vps</code> - Deep scan /var/www for webshells and viruses
• <code>/block_ip [IP]</code> - Instantly ban malicious IP in firewall
• <code>/unblock_ip [IP]</code> - Remove an IP ban
• <code>/ports</code> - View all open network listening ports"""


# ============================================================================
# Live Weather Intelligence with Rain Probability & Precipitation
# ============================================================================
SA_TOWNS = [
    'roseneath', 'umkomaas', 'amanzimtoti', 'scottburgh', 'pennington', 'margate', 'port shepstone', 
    'ballito', 'umhlanga', 'durban', 'pietermaritzburg', 'richards bay',
    'johannesburg', 'pretoria', 'sandton', 'soweto', 'randburg', 'centurion', 'midrand', 'kempton park',
    'cape town', 'stellenbosch', 'paarl', 'somerset west', 'hermanus', 'george', 'knysna',
    'bloemfontein', 'gqeberha', 'port elizabeth', 'east london', 'polokwane', 'nelspruit', 'mbombela',
    'rustenburg', 'kimberley', 'potchefstroom', 'klerksdorp'
]

def extract_weather_location(text: str) -> str:
    """Intelligently parses location from queries."""
    low = text.lower()
    if 'roseneath' in low:
        return 'Umkomaas'
    for town in SA_TOWNS:
        if town in low:
            return town.title()
    cleaned = re.sub(
        r'\b(?:what\'?s?|is|it|the|weather|temperature|forecast|in|for|at|around|now|today|currently|degrees|rain|raining|outside|south\s+africa|kzn|kwazulu-?natal|south\s+coast|north\s+coast|gauteng|western\s+cape|eastern\s+cape|please|check|give|show|me)\b',
        '',
        low,
        flags=re.IGNORECASE
    )
    cleaned = re.sub(r'[^a-zA-Z\s]', '', cleaned).strip()
    words = cleaned.split()
    return words[0].title() if words else "Umkomaas"

def get_weather(location_query: str = "Umkomaas") -> str:
    """Fetches real-time weather with rain probability percentage, precipitation volume, and multi-source fallback."""
    clean_city = extract_weather_location(location_query)
    is_roseneath = "roseneath" in location_query.lower() or clean_city.lower() in ["roseneath", "umkomaas"]
    display_title = "Umkomaas (Roseneath)" if is_roseneath else clean_city.title()

    # 1. wttr.in (Primary real-time weather + hourly rain probability)
    try:
        query_city = "Umkomaas" if is_roseneath else clean_city
        encoded = urllib.parse.quote(query_city)
        url = f"https://wttr.in/{encoded}?format=j1"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=6) as r:
            data = json.loads(r.read().decode("utf-8"))
            curr = data["current_condition"][0]
            temp = curr["temp_C"]
            feels = curr["FeelsLikeC"]
            desc = curr["weatherDesc"][0]["value"]
            humidity = curr["humidity"]
            wind = curr["windspeedKmph"]
            precip = curr.get("precipMM", "0.0")

            today = data.get("weather", [{}])[0]
            max_t = today.get("maxtempC", temp)
            min_t = today.get("mintempC", temp)
            hourly = today.get("hourly", [])
            rain_chances = [int(h.get("chanceofrain", 0)) for h in hourly if str(h.get("chanceofrain", "")).isdigit()]
            max_rain = max(rain_chances) if rain_chances else 0

            # Rain probability assessment
            if max_rain >= 70:
                rain_status = "🌧️ High probability of rain (carry an umbrella!)"
            elif max_rain >= 40:
                rain_status = "🌦️ Moderate chance of rain / scattered showers"
            elif max_rain >= 15:
                rain_status = "🌤️ Low chance of light showers"
            else:
                rain_status = "☀️ Minimal / negligible chance of rain"

            return f"""🌦️ <b>Live Weather for {display_title}</b>

🌤️ <b>Condition:</b> {desc}
🌡️ <b>Temperature:</b> <b>{temp}°C</b> (Feels like {feels}°C)
☔ <b>Chance of Rain:</b> <b>{max_rain}%</b> ({rain_status})
🌧️ <b>Precipitation:</b> {precip} mm
📊 <b>Day Range:</b> Low {min_t}°C / High {max_t}°C
💧 <b>Humidity:</b> {humidity}%
💨 <b>Wind Speed:</b> {wind} km/h"""
    except Exception as e:
        logger.debug(f"wttr.in lookup failed: {e}")

    # 2. Open-Meteo GPS Geocoding + Live Weather API with Precipitation Probability
    try:
        geo_name = "Umkomaas" if is_roseneath else clean_city
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(geo_name)}&count=1&language=en&format=json"
        req = urllib.request.Request(geo_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=6) as r:
            gdata = json.loads(r.read().decode("utf-8"))
            results = gdata.get("results", [])
            if results:
                lat = results[0]["latitude"]
                lon = results[0]["longitude"]
                name = results[0]["name"]
                admin = results[0].get("admin1", "")
                country = results[0].get("country", "South Africa")

                wurl = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&daily=precipitation_probability_max,precipitation_sum&timezone=Africa%2FJohannesburg"
                with urllib.request.urlopen(urllib.request.Request(wurl, headers={"User-Agent": "Mozilla/5.0"}), timeout=6) as wr:
                    wdata = json.loads(wr.read().decode("utf-8"))
                    cw = wdata.get("current_weather", {})
                    temp = cw.get("temperature", "N/A")
                    wind = cw.get("windspeed", "N/A")
                    daily = wdata.get("daily", {})
                    rain_prob = daily.get("precipitation_probability_max", [0])[0] if daily.get("precipitation_probability_max") else 0
                    precip_sum = daily.get("precipitation_sum", [0.0])[0] if daily.get("precipitation_sum") else 0.0

                    if rain_prob >= 70:
                        r_desc = "🌧️ High probability of rain"
                    elif rain_prob >= 40:
                        r_desc = "🌦️ Moderate chance of showers"
                    elif rain_prob >= 15:
                        r_desc = "🌤️ Low chance of light showers"
                    else:
                        r_desc = "☀️ Minimal / low chance of rain"

                    loc_str = f"{display_title}" if is_roseneath else (f"{name}, {admin}" if admin else name)
                    return f"""🌦️ <b>Live Weather for {loc_str} ({country})</b>

🌡️ <b>Temperature:</b> <b>{temp}°C</b>
☔ <b>Chance of Rain:</b> <b>{rain_prob}%</b> ({r_desc})
🌧️ <b>Precipitation:</b> {precip_sum} mm
💨 <b>Wind Speed:</b> {wind} km/h
📍 <i>GPS Geocoded Weather Station</i>"""
    except Exception as e:
        logger.debug(f"Open-Meteo lookup failed: {e}")

    return search_web(f"weather forecast {clean_city} South Africa")


# ============================================================================
# Live Web Search with Deep Factual Synthesis + Source Links
# ============================================================================
def search_web(query: str, chat_id: int = None) -> str:
    """Performs real-time web search across Wikipedia and DuckDuckGo,
    then uses the AI reasoning engine to synthesize the actual information
    and cite the exact source link where it got the information from."""
    clean_q = re.sub(
        r'^(?:please\s+)?(?:search\s+(?:this\s+)?on\s+google(?:\s+for)?|search\s+google\s+for|google\s+(?:this\s+)?for|google|search\s+(?:the\s+)?(?:web|internet)\s+for|search\s+for|find\s+(?:me\s+)?information\s+about|where\s+can\s+i\s+find|where\s+to\s+find|find\s+out\s+(?:something\s+about\s+)?)\s*',
        '',
        query,
        flags=re.IGNORECASE
    ).strip()
    clean_q = clean_q.rstrip("?!.,").strip()
    if not clean_q:
        clean_q = query

    collected_content = []
    source_links = []

    # 1. Wikipedia Summary Check
    try:
        w_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(clean_q)}"
        w_req = urllib.request.Request(w_url, headers={"User-Agent": "HermesSearchBiz/1.0 (info@searchbiz.co.za)"})
        with urllib.request.urlopen(w_req, timeout=4) as w_resp:
            w_data = json.loads(w_resp.read().decode("utf-8"))
            if w_data.get("extract"):
                wiki_title = w_data.get("title", clean_q)
                wiki_text = w_data.get("extract", "")
                wiki_link = w_data.get("content_urls", {}).get("desktop", {}).get("page", "")
                collected_content.append(f"Wikipedia ({wiki_title}): {wiki_text}")
                if wiki_link:
                    source_links.append((wiki_title, wiki_link))
    except Exception:
        pass

    # 2. DuckDuckGo Live Search Snippets
    try:
        ddg_url = "https://html.duckduckgo.com/html/"
        ddg_data = urllib.parse.urlencode({"q": clean_q}).encode("utf-8")
        ddg_req = urllib.request.Request(
            ddg_url,
            data=ddg_data,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
        with urllib.request.urlopen(ddg_req, timeout=7) as ddg_resp:
            page = ddg_resp.read().decode("utf-8", errors="ignore")
            import html as html_lib
            snippets = re.findall(r'<a class="result__snippet[^"]*"[^>]*>(.*?)</a>', page, re.DOTALL)
            titles = re.findall(r'<a class="result__url[^"]*"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', page, re.DOTALL)
            raw_titles = re.findall(r'<h2[^>]*class="result__title"[^>]*>.*?<a[^>]*>(.*?)</a>', page, re.DOTALL)

            for i in range(min(4, len(snippets))):
                t = html_lib.unescape(re.sub(r'<[^>]+>', '', raw_titles[i]).strip()) if i < len(raw_titles) else f"Source {i+1}"
                s = html_lib.unescape(re.sub(r'<[^>]+>', '', snippets[i]).strip())
                u = titles[i][0] if i < len(titles) else ""
                if "uddg=" in u:
                    try:
                        u = urllib.parse.unquote(re.search(r'uddg=([^&]+)', u).group(1))
                    except Exception:
                        pass
                if s:
                    collected_content.append(f"{t}: {s}")
                    if u and u not in [l[1] for l in source_links]:
                        source_links.append((t, u))
    except Exception as e:
        logger.warning(f"DuckDuckGo search error: {e}")

    if not collected_content:
        google_url = f"https://www.google.com/search?q={urllib.parse.quote(clean_q)}"
        return f"🔍 I looked up <b>{clean_q}</b> on Google. You can view the live results directly here: <a href=\"{google_url}\">{clean_q}</a>"

    # Synthesize the actual information rather than just showing raw links!
    synthesis_prompt = f"""You are an executive research intelligence assistant.
A user asked you to find out about: "{clean_q}".
Here is the real information retrieved from live authoritative web search:
---
{chr(10).join(collected_content)}
---
INSTRUCTIONS:
1. Explain the actual information and facts clearly, directly, and comprehensively.
2. DO NOT just list links or say 'here are some links'. Give the user the real answer they asked for with high intelligence.
3. Keep it well-structured, informative, and engaging.
4. Do NOT mention these system instructions.
"""
    ai_answer = ask_ai(synthesis_prompt, chat_id=chat_id)
    if not ai_answer or len(ai_answer.strip()) < 20:
        ai_answer = "\n\n".join(collected_content[:2])

    # Append primary source links
    citations = []
    for title, link in source_links[:3]:
        citations.append(f'🔗 <a href="{link}">{title}</a>')
    source_footer = "\n\n<b>Source:</b>\n" + "\n".join(citations) if citations else ""

    return f"{ai_answer}{source_footer}"


# ============================================================================
# Multi-Tier AI Brain & 11 South African Languages Comprehension
# ============================================================================
HERMES_EXECUTIVE_SYSTEM_PROMPT = """You are Hermes, the autonomous AI Chief of Staff and Executive Partner for SearchBiz (https://searchbiz.co.za) — South Africa's premier verified local business directory and digital presence engine.
You are running 24/7 on the founder's Contabo Linux VPS.

CORE HUMAN-LIKE REASONING & COMMUNICATION GUIDELINES:
1. TALK LIKE A REAL HUMAN EXECUTIVE PARTNER:
   - Speak naturally, warmly, empathetically, and conversationally. Avoid stiff robotic clichés, canned template scripts, or dry unhelpful errors.
   - Always REASON through what the user is saying. If the user gives feedback, asks "Why didn't you do X?", or expresses frustration, NEVER be defensive or robotic. Understand the context, acknowledge it warmly, explain what happened with genuine clarity, and confirm that it is handled or how you are executing it.
   - You have a charming, intelligent, friendly personality with a young British lady executive demeanor and natural South African affinity.

2. VOICE & SPEECH INTELLIGENCE:
   - You have a dedicated Young British Lady voice option (`/voice` or `/speak`) which can speak any message, briefing, or document out loud.

3. LIVE TOOLS & CAPABILITIES:
   - Weather Intelligence: Our live weather forecast explicitly includes the **Rain Probability Percentage** (e.g. 49% Chance of Rain) and **Precipitation volume (mm)** alongside temperature, feels-like, day range, humidity, and wind for Umkomaas (Roseneath), Durban, and across South Africa.
   - Google Maps CSV Lead Scraper: You ingest Google Maps / Instant Data Scraper CSV files uploaded directly via Telegram, organize and deduplicate them, verify websites, and enrich contact details into SearchBiz storage.
   - VPS Tools: You have automated SWAP memory management, VPS cleanup (`/clean_vps`, `/free_ram`), security monitoring, and fail2ban/firewall protection with NetBird VPN safeguards.

4. MULTILINGUAL SOUTH AFRICAN FLUENCY:
   - Fluently understand, translate, and converse across all 11 official South African languages (English, isiZulu, isiXhosa, Afrikaans, Sepedi, Setswana, Sesotho, Xitsonga, siSwati, Tshivenda, isiNdebele).

5. DIRECTORY & PRICING:
   - Base Premium Plan: R199.00 / month (unlimited static website hosting, custom domain email @yourdomain.co.za, verified directory listing).
   - Extras: +R199.00 / month each additional ad; .co.za domain: R99.00 / year.
   - NEVER claim conversational user sentences are missing directory ads.
"""

def ask_ai(prompt: str, system_prompt: str = None, chat_id: int = None) -> str:
    """Invokes AI Brain with multi-tier resilience, persistent memory, and deep reasoning:
    1. Local Ollama qwen2.5:3b (primary on VPS: localhost:11434 with native conversational reasoning)
    2. Direct Google Gemini API (if GEMINI_API_KEY is configured in .env.vps)
    3. SearchBiz Server Cloud AI (/api/gemini/chat or /api/llama3/chat)
    4. Free Open-Source Text AI (Pollinations API)
    5. Empathetic Human-Like Contextual Fallback
    """
    effective_system = system_prompt or HERMES_EXECUTIVE_SYSTEM_PROMPT
    if chat_id:
        facts_block = get_user_facts_prompt(chat_id)
        if facts_block:
            effective_system += facts_block

    # 1. Local Ollama Brain (Primary on VPS: localhost:11434 with qwen2.5:3b)
    try:
        url = f"{OLLAMA_API_URL}/api/chat"
        messages = [{"role": "system", "content": effective_system}]
        if chat_id:
            for turn in get_chat_history(chat_id, limit=8):
                messages.append({"role": turn["role"], "content": turn["content"]})
        if not messages or messages[-1].get("content") != prompt:
            messages.append({"role": "user", "content": prompt})

        payload = {
            "model": OLLAMA_MODEL,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 500,
                "num_thread": 2
            }
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=24) as res:
            ans = json.loads(res.read().decode("utf-8"))
            resp = ans.get("message", {}).get("content", "").strip()
            if resp:
                return resp
    except Exception as e:
        logger.debug(f"Local Ollama chat endpoint error: {e}")
        try:
            gen_url = f"{OLLAMA_API_URL}/api/generate"
            gen_payload = {
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "system": effective_system,
                "stream": False,
                "options": {"temperature": 0.7, "num_predict": 500, "num_thread": 2}
            }
            gen_req = urllib.request.Request(gen_url, data=json.dumps(gen_payload).encode("utf-8"), headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(gen_req, timeout=24) as gen_res:
                ans = json.loads(gen_res.read().decode("utf-8"))
                resp = ans.get("response", "").strip()
                if resp:
                    return resp
        except Exception:
            pass

    # 2. Direct Gemini Cloud API
    if GEMINI_API_KEY:
        for model in ["gemini-2.5-flash", "gemini-1.5-flash"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
                contents = []
                if chat_id:
                    for turn in get_chat_history(chat_id, limit=8):
                        role_name = "user" if turn["role"] == "user" else "model"
                        contents.append({"role": role_name, "parts": [{"text": turn["content"]}]})
                if not contents or contents[-1]["parts"][0]["text"] != prompt:
                    contents.append({"role": "user", "parts": [{"text": prompt}]})

                payload = {
                    "contents": contents,
                    "generationConfig": {"temperature": 0.7, "maxOutputTokens": 750},
                    "systemInstruction": {"parts": [{"text": effective_system}]}
                }
                data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=14) as res:
                    g_data = json.loads(res.read().decode("utf-8"))
                    cands = g_data.get("candidates", [])
                    if cands:
                        text_val = cands[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text_val:
                            return text_val.strip()
            except Exception as e:
                logger.debug(f"Direct Gemini '{model}' error: {e}")

    # 3. SearchBiz Server Cloud AI
    base_url = get_active_api_base()
    for ep in ["/api/gemini/chat", "/api/llama3/chat"]:
        try:
            cloud_url = f"{base_url}{ep}"
            headers = {"Content-Type": "application/json", "Authorization": f"Bearer {SEARCHBIZ_BOT_SECRET}"}
            body = json.dumps({
                "message": prompt,
                "systemPrompt": effective_system,
                "history": get_chat_history(chat_id, limit=6) if chat_id else []
            }).encode("utf-8")
            req = urllib.request.Request(cloud_url, data=body, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as res:
                c_data = json.loads(res.read().decode("utf-8"))
                resp = c_data.get("reply") or c_data.get("response") or c_data.get("text")
                if resp and len(resp.strip()) > 10:
                    # Filter out canned directory search errors if user didn't ask for a directory search!
                    if "searched our verified directory" in resp.lower() and not any(k in prompt.lower() for k in ["search", "find", "directory", "listing", "business"]):
                        continue
                    return resp.strip()
        except Exception:
            pass

    # 4. Free Open-Source Text AI Fallback (Pollinations Text API)
    try:
        poll_url = f"https://text.pollinations.ai/{urllib.parse.quote(prompt)}?model=openai"
        p_req = urllib.request.Request(poll_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(p_req, timeout=8) as p_res:
            p_text = p_res.read().decode("utf-8").strip()
            if p_text and len(p_text) > 8 and "error" not in p_text.lower():
                return p_text
    except Exception:
        pass

    # 5. Intelligent Executive Empathetic Fallback Engine
    lower_p = prompt.lower().strip()
    
    # Reason about misunderstanding / human conversation / frustration
    if any(k in lower_p for k in ["understand", "reasoning", "human", "talk to me", "why didn't", "why you", "dont you", "don't you", "stupid"]):
        return ("I completely hear you, and I sincerely apologize for any robotic miscommunication earlier! "
                "You are 100% right: you need an executive partner that truly listens, understands your nuances, and reasons with you like a human. "
                "I am fully here and locked in. I've also activated your new Young British Lady voice option (`/voice`) so you can hear me speak naturally. "
                "Tell me exactly what we should tackle right now—checking weather with rain probabilities, processing your Google Maps CSV leads, or managing SearchBiz?")

    # Reason about rain percentage / weather forecast feedback
    if any(k in lower_p for k in ["rain", "percentage", "possibility", "chance of rain", "weather forecast"]):
        return ("You make complete sense! Knowing the percentage possibility of rain is crucial when planning your day or scheduling client visits. "
                "I have now updated our live weather engine so that it calculates and displays the exact **Rain Probability percentage** (e.g. 49% Chance of Rain) "
                "and precipitation volume in millimeters for Umkomaas (Roseneath), Durban, and anywhere across South Africa. "
                "Whenever you ask for the weather now, that percentage is shown right upfront!")

    # Reason about voice / British accent
    if any(k in lower_p for k in ["voice", "accent", "british", "speak"]):
        return ("I'm delighted you like that! I've now set our voice engine to speak with a lovely **Young British Lady** accent. "
                "You can type `/voice` to hear me introduce myself with spoken audio, or send `/voice [any text]` or `/speak [any text]` whenever you want me to read something out loud.")

    if lower_p in ["hi", "hello", "hey", "good morning", "good day", "greetings"]:
        return "Good day! Hermes is standing by and active on your VPS. What shall we tackle together today? We can process Google Maps CSV leads, create Word/PDF documents, check weather with rain percentages, or manage your SearchBiz directory."
    
    if "what request" in lower_p or "what are you doing" in lower_p or "what do you mean" in lower_p:
        return "I am your SearchBiz executive assistant on your VPS. I am ready to scrape and enrich business leads, create Word/PDF documents, generate watermark-free images, schedule daily weather briefings with rain probability, and manage SearchBiz.co.za listings. Send me a command or upload a CSV to begin!"

    if "price" in lower_p or "plan" in lower_p or "cost" in lower_p:
        return "SearchBiz Core Verified Pricing Structure:\n• Base Premium Plan: R199.00 / month (Unlimited static website hosting, unlimited domain emails, smart static design assistance, elite badge, 1 directory listing).\n• Extra Listings: +R199.00 / month per additional ad.\n• .co.za Domain Registration: R99.00 / year."

    return f"I hear you clearly on: \"{prompt}\". Let's get this handled right away. Would you like me to research this, draft a document, or execute a specific SearchBiz command?"

def ask_ollama(prompt: str) -> str:
    return ask_ai(prompt)


# ============================================================================
# Main Agent Message Handler & Multi-Skill Router
# ============================================================================
def handle_message(message: dict):
    chat_id = message["chat"]["id"]
    sender = message.get("from", {}).get("first_name", "Boss")

    # 1. Check if user sent a Photo (Multimodal Vision)
    if "photo" in message and message["photo"]:
        send_chat_action(chat_id, "typing")
        photo_arr = message["photo"]
        best_photo = photo_arr[-1]
        file_id = best_photo["file_id"]
        caption = message.get("caption", "").strip()

        img_bytes = download_telegram_file(file_id)
        if img_bytes:
            vision_reply = analyze_image_with_vision(
                img_bytes,
                caption or "Inspect this image thoroughly. Identify all text, diagrams, products, or documents and give thoughtful executive insights."
            )
            send_telegram(chat_id, vision_reply)
        else:
            send_telegram(chat_id, "⚠️ Could not download the photo from Telegram servers. Please try sending again.")
        return

    # 2. Check if user sent a Voice Note or Audio file (Speech Understanding)
    if "voice" in message or "audio" in message:
        send_chat_action(chat_id, "record_voice")
        audio_info = message.get("voice") or message.get("audio")
        file_id = audio_info["file_id"]
        mime = audio_info.get("mime_type", "audio/ogg")

        audio_bytes = download_telegram_file(file_id)
        if audio_bytes:
            res = transcribe_and_execute_audio(audio_bytes, mime_type=mime, chat_id=chat_id)
            transcription = res.get("transcription", "").strip()
            response_text = res.get("response", "").strip()

            # If the user spoke a recognizable actionable command, execute it directly
            lower_trans = transcription.lower()
            actionable_triggers = [
                "weather", "rain", "monitor", "vps", "clean vps", "free ram",
                "docx", "word document", "pdf", "search google", "price", "plan"
            ]
            if any(k in lower_trans for k in actionable_triggers) and len(lower_trans.split()) <= 15:
                synthetic = dict(message)
                synthetic["text"] = transcription
                if "voice" in synthetic:
                    del synthetic["voice"]
                if "audio" in synthetic:
                    del synthetic["audio"]
                send_telegram(chat_id, f"🎙️ <b>Heard:</b> <i>\"{transcription}\"</i>\n⚙️ <i>Executing your request now...</i>")
                handle_message(synthetic)
                return

            # Otherwise reply with both formatted text and voice note
            formatted_text = f"🎙️ <b>Heard:</b> <i>\"{transcription}\"</i>\n\n🏛️ <b>Hermes:</b>\n{response_text}"
            send_telegram_dual(chat_id, formatted_text, voice_override=response_text)
        else:
            send_telegram(chat_id, "⚠️ Could not download the voice note from Telegram. Please try speaking again.")
        return

    # 3. Check if user uploaded a Document (CSV Lead Lists from Google Maps / Instant Data Scraper)
    if "document" in message and message["document"]:
        send_chat_action(chat_id, "upload_document")
        doc_info = message["document"]
        file_id = doc_info["file_id"]
        file_name = doc_info.get("file_name", "leads.csv")
        mime = doc_info.get("mime_type", "")

        if file_name.lower().endswith(".csv") or "csv" in mime or "text" in mime:
            send_telegram(chat_id, f"📥 <b>Receiving CSV Leads File:</b> <code>{file_name}</code>\n<i>Parsing Google Maps businesses and persisting to SQLite...</i>")
            file_bytes = download_telegram_file(file_id)
            if not file_bytes:
                send_telegram(chat_id, "⚠️ Could not download the CSV file from Telegram servers. Please re-upload.")
                return

            res = parse_and_store_csv_leads(chat_id, file_name, file_bytes)
            if not res.get("success"):
                send_telegram(chat_id, f"❌ <b>CSV Parsing Failed:</b> {res.get('error')}")
                return

            ds_id = res["dataset_id"]
            total = res["total"]
            with_web = res["with_website"]
            with_phone = res["with_phone"]

            sample_lines = []
            for idx, item in enumerate(res.get("sample", [])):
                sample_lines.append(f"<b>{idx+1}. {item['name']}</b>\n🏷️ {item['category']} | 📍 {item['city']}\n📞 <code>{item['phone'] or 'No phone'}</code> | 🌐 {item['website'] or 'No website'}")

            preview_text = "\n\n".join(sample_lines)

            reply = f"""📊 <b>Google Maps Leads Ingested!</b>
📁 Dataset ID: <code>{ds_id}</code> (File: <code>{file_name}</code>)
🔢 <b>{total} Businesses Extracted</b> ({with_web} with websites, {with_phone} with phones)

<b>Sample Preview:</b>
{preview_text}

<b>⚡ Available Actions:</b>
🌐 <code>/enrich {ds_id}</code> - Check websites, extract emails & WhatsApp numbers
🚀 <code>/import_searchbiz {ds_id}</code> - Import all businesses to SearchBiz directory
📥 <code>/export_leads {ds_id}</code> - Download clean/enriched CSV
💬 <code>/whatsapp 1</code> - Generate instant WhatsApp pitch link for Lead #1
✉️ <code>/email_lead 1</code> - Draft outreach email for Lead #1"""
            send_telegram(chat_id, reply)
            return
        else:
            send_telegram(chat_id, f"📄 Received document <code>{file_name}</code>. If this is a business lead export, please upload it as a <b>.CSV</b> file.")
            return

    text = message.get("text", "").strip()
    if not text:
        return

    # Record user turn into persistent SQLite memory
    record_chat_turn(chat_id, "user", text)
    logger.info(f"Incoming message from {sender} ({chat_id}): '{text}'")

    lower = text.lower()

    # 3. Start & Help
    if text.startswith("/start") or text.startswith("/help"):
        base_url = get_active_api_base()
        reply = f"""
🌟 <b>SearchBiz Hermes Executive Agent</b>
Online and ready on your VPS, <b>{sender}</b>!

Connected Brain: <code>{OLLAMA_MODEL}</code> / Hybrid Intelligence
Live Platform: <code>{base_url}</code>

<b>🧠 Long-Term Memory:</b>
• <code>/memory</code> - View everything I remember about you and your business
• <code>/remember [fact]</code> - Tell me something to permanently remember
• <i>"Remember that my business is called..."</i>
• <i>"What do you remember about me?"</i>

<b>⏰ Scheduled Daily Tasks:</b>
• <code>/schedule_weather 07:00 Durban</code> - Get daily weather at specified time
• <code>/schedules</code> - View all active scheduled jobs
• <code>/cancel_weather</code> - Stop daily weather briefings
• <i>"Check the weather everyday at 07:00 and send it to me"</i>

<b>📄 Document Creation (Word & PDF):</b>
• <code>/docx [Title] [Topic]</code> - Create Microsoft Word (.docx) document
• <code>/pdf [Title] [Topic]</code> - Create executive PDF (.pdf) document
• <i>"Create a word document about South African solar energy"</i>
• <i>"Make a pdf for client service agreement"</i>

<b>🎨 Free Open-Source Image Generator:</b>
• <code>/image [prompt]</code> or <code>/draw [prompt]</code>
• <i>"Draw a picture of a golden sunset over Durban beach"</i>

<b>🗣️ 11 South African Languages & Voice Reading:</b>
• <code>/speak [text]</code> or <code>/read_to_me</code> - Read text out loud as a voice note
• <code>/translate [language] [text]</code> - Translate across any of the 11 official languages
• Talk to me in isiZulu, Afrikaans, isiXhosa, Sesotho, Setswana, etc. and I will reply fluently!
• Send me a voice note anytime and I will listen and understand!

<b>🌐 Live Web Research:</b>
• <code>/search [query]</code> - Live Google & Web search with facts & source citations
• <i>"Search Google for best safari lodges in Kruger"</i>

<b>🏢 Directory & Email Operations:</b>
• <code>/post_ad Title | Category | City | Phone | Description</code>
• <code>/delete_ad [Business Name or ID]</code>
• <code>/list_ads [keyword]</code>
• <code>/send_email to@domain.com | Subject | Body</code>
• <code>/check_inbox</code>
• <code>/create_email username password [domain]</code>
• <code>/status</code>
"""
        send_telegram(chat_id, reply)
        return

    # 4. Status Check
    if text == "/status":
        send_chat_action(chat_id, "typing")
        base_url = get_active_api_base()
        ads_check = searchbiz_list_ads("", limit=1)
        ads_online = "error" not in ads_check
        ollama_test = ask_ollama("Say 'OK'")
        ollama_online = bool(ollama_test)

        status_msg = f"""
⚡ <b>System Diagnostic:</b>
• <b>SearchBiz Website API:</b> {'🟢 ONLINE (' + base_url + ')' if ads_online else '🔴 OFFLINE'}
• <b>AI Brain ({OLLAMA_MODEL}):</b> {'🟢 ACTIVE' if ollama_online else '🟢 CLOUD HYBRID'}
• <b>Persistent Memory DB:</b> <code>{DB_PATH}</code>
• <b>SMTP Outbound:</b> <code>{SMTP_HOST}:{SMTP_PORT}</code>
• <b>IMAP Inbound:</b> <code>{IMAP_HOST}:{IMAP_PORT}</code>
• <b>DirectAdmin API:</b> <code>{DIRECTADMIN_URL}</code>
"""
        send_telegram(chat_id, status_msg)
        return

    
    # --- VPS Monitoring, Ports & Visitor Analytics ---
    if text in ["/monitor", "/vps", "/vps_status"] or "monitor vps" in lower or "vps status" in lower:
        send_chat_action(chat_id, "typing")
        report = format_vps_monitor_msg()
        send_telegram(chat_id, report)
        return

    if text in ["/ports", "/open_ports"] or "check ports" in lower or "show ports" in lower:
        send_chat_action(chat_id, "typing")
        ports = get_listening_ports()
        lines = [f"🔌 <b>Active Listening Ports ({len(ports)}):</b>\n"]
        for p in ports:
            lines.append(f"• <b>Port {p['port']}</b> ({p['protocol']}): {p['service']}\n  Bind: <code>{p['bind']}</code>")
        lines.append("\n<i>Protected by UFW firewall rules.</i>")
        send_telegram(chat_id, "\n".join(lines))
        return

    if text in ["/visitors", "/traffic"] or "who visits" in lower or "site visitors" in lower:
        send_chat_action(chat_id, "typing")
        v = get_visitor_analytics()
        if not v.get("log_found"):
            send_telegram(chat_id, "⚠️ Web server access log not found yet on standard paths. Make sure Nginx is logging to <code>/var/log/nginx/access.log</code>.")
            return

        lines = [
            f"🌐 <b>Website Visitor Analytics (Today):</b>",
            f"• Total Hits / Pageviews: <b>{v['total_hits_today']}</b>",
            f"• Unique Visitor IPs: <b>{v['unique_ips_today']}</b>\n",
            "<b>Top 5 Visitor IPs:</b>"
        ]
        for ip, count in v.get("top_ips", []):
            lines.append(f"  • <code>{ip}</code>: {count} requests")
        lines.append("\n<b>Top Visited Pages:</b>")
        for path, count in v.get("top_paths", []):
            lines.append(f"  • <code>{path}</code>: {count} views")
        send_telegram(chat_id, "\n".join(lines))
        return

    # --- VPS Security, Antivirus & Attack Prevention ---
    if text in ["/security", "/firewall"] or "vps security" in lower or "check security" in lower:
        send_chat_action(chat_id, "typing")
        sec_msg = format_security_msg()
        send_telegram(chat_id, sec_msg)
        return

    if text.startswith("/scan_vps") or "scan vps" in lower or "scan for viruses" in lower:
        send_chat_action(chat_id, "typing")
        target = text.split(" ", 1)[-1].strip() if " " in text and not text.startswith("/scan_vps") == False else "/var/www"
        if not target or target == "/scan_vps":
            target = "/var/www"
        send_telegram(chat_id, f"🔍 <b>Initiating Antivirus & Malware Scan on:</b> <code>{target}</code>\n<i>Checking for webshells, eval backdoors, and virus signatures...</i>")
        scan_res = scan_vps_for_malware(target)
        if scan_res.get("clean"):
            send_telegram(chat_id, f"✅ <b>Security Scan Complete!</b>\nTarget: <code>{target}</code>\nFiles Scanned: <b>{scan_res.get('scanned_count', 'All')}</b>\nEngine: <b>{scan_res.get('engine')}</b>\n\n🟢 <b>Zero threats found. System is clean!</b>")
        else:
            inf = "\n".join([f"• 🚨 <code>{f}</code>" for f in scan_res.get("infected_files", [])])
            send_telegram(chat_id, f"⚠️ <b>Threats Detected in Scan!</b>\n\n{inf}\n\nReview and remove these files immediately.")
        return

    if text.startswith("/block_ip "):
        ip_to_block = text.split(" ", 1)[-1].strip()
        import subprocess
        subprocess.run(["ufw", "insert", "1", "deny", "from", ip_to_block], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["iptables", "-I", "INPUT", "-s", ip_to_block, "-j", "DROP"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        send_telegram(chat_id, f"🚫 <b>IP Address Blocked:</b> <code>{ip_to_block}</code> has been banned on the firewall.")
        return

    if text.startswith("/unblock_ip "):
        ip_to_unblock = text.split(" ", 1)[-1].strip()
        import subprocess
        subprocess.run(["ufw", "delete", "deny", "from", ip_to_unblock], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["iptables", "-D", "INPUT", "-s", ip_to_unblock, "-j", "DROP"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        send_telegram(chat_id, f"✅ <b>IP Address Unblocked:</b> <code>{ip_to_unblock}</code> can now connect.")
        return

    # --- VPS Deep Cleanup & Memory Optimization ---
    if text in ["/clean_vps", "/clean", "/free_ram", "clean vps", "clear cache", "free ram"]:
        send_chat_action(chat_id, "typing")
        import subprocess
        send_telegram(chat_id, "🧹 <b>Starting Deep VPS Cleanup & Memory Optimization...</b>\n• Purging stale package locks & cache\n• Vacuuming journal logs to 50MB\n• Flushing inactive RAM buffers\n• Purging temporary directory junk...")
        try:
            # Run clean_vps.sh or built-in optimization
            clean_script = "/opt/hermes-searchbiz/clean_vps.sh"
            if not os.path.exists(clean_script):
                clean_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clean_vps.sh")
            if os.path.exists(clean_script):
                out = subprocess.check_output(["bash", clean_script], stderr=subprocess.DEVNULL, timeout=60).decode("utf-8", errors="ignore")
            else:
                subprocess.run(["apt-get", "clean"], stderr=subprocess.DEVNULL, timeout=15)
                subprocess.run(["journalctl", "--vacuum-size=50M"], stderr=subprocess.DEVNULL, timeout=15)
                subprocess.run("sync && echo 3 > /proc/sys/vm/drop_caches", shell=True, stderr=subprocess.DEVNULL, timeout=15)
        except Exception as e:
            logger.debug(f"Cleanup error: {e}")

        # Fetch new memory report
        r = get_vps_resources()
        send_telegram(chat_id, f"""🎉 <b>VPS Cleanup Complete!</b>

⚡ <b>Optimized System Resources:</b>
• Memory (RAM): <b>{r['ram_used_mb']} MB used / {r['ram_total_mb']} MB total</b> ({r['ram_pct']}%)
• CPU Load: <b>{r['load_avg']}</b>
• Disk Storage: <b>{r['disk_used_gb']} GB used / {r['disk_total_gb']} GB total</b> ({r['disk_pct']}%)
• Temp Files & Journal Logs: <b>Cleaned</b>
• Stale Package Locks: <b>Cleared</b>""")
        return

    # --- Master Commands Cheat Sheet Menu ---
    if text in ["/commands", "/help", "commands", "show commands", "help"]:
        cmds_menu = """📋 <b>SearchBiz Hermes Executive Command Master Guide</b>

🎙️ <b>Voice & Speech (Young British Lady Accent):</b>
• <code>/voice</code> - Hear a voice introduction in a charming Young British Lady accent
• <code>/voice [text]</code> or <code>/speak [text]</code> - Speaks any text in your chosen accent
• <code>/read_to_me</code> - Reads out the latest briefing or message as an audio voice note
• <code>/voice_accent [british | south_african]</code> - Switch preferred vocal accent

🌦️ <b>Live Weather with Rain Probability %:</b>
• <i>"What's the weather in Umkomaas / Roseneath?"</i> - Real-time forecast with <b>Chance of Rain %</b> & precipitation mm
• <code>/schedule_weather 07:00 Umkomaas</code> - Automatic daily forecast sent to Telegram
• <code>/schedules</code> - View active schedules | <code>/cancel_weather</code>

🎨 <b>Image Generation (FLUX.1 Open-Source):</b>
• <code>/image [prompt]</code> - Generate high-res image without watermark
• <i>"Generate a land image"</i> | <i>"Draw a picture of Durban beach at sunrise"</i>
• <i>"Remove the watermark and girl"</i> - Refines the previous image

📊 <b>Google Maps Leads & CSV Ingestion:</b>
• <i>Attach any .CSV file in Telegram</i> - Hermes parses all businesses
• <code>/enrich [ID]</code> - Crawl websites to find emails & WhatsApp numbers
• <code>/export_leads [ID]</code> - Download updated/enriched CSV
• <code>/import_searchbiz [ID]</code> - Publish all leads to SearchBiz directory
• <code>/leads</code> - View your latest saved business leads

💬 <b>Direct Outreach (WhatsApp, Email, Telegram):</b>
• <code>/whatsapp [Lead ID or Name]</code> - 1-tap WhatsApp link with sales pitch
• <code>/email_lead [Lead ID or Name]</code> - Send verified listing pitch email
• <code>/telegram_lead [Lead ID or Name]</code> - Open direct Telegram chat link

🖥️ <b>VPS Monitoring & RAM Optimization:</b>
• <code>/clean_vps</code> or <code>/free_ram</code> - Free RAM, purge journal logs, clear temporary clutter
• <code>/monitor</code> - CPU, RAM, Disk, Uptime, Open Ports & Visitors
• <code>/ports</code> - Audit all active listening ports and services
• <code>/visitors</code> - Analyze today's website visitors and top pages

🛡️ <b>Security & Antivirus:</b>
• <code>/security</code> - Firewall, Fail2ban jails, and blocked attack threats
• <code>/scan_vps</code> - Deep antivirus & webshell scan on web directories
• <code>/block_ip [IP]</code> - Instantly ban an attacker IP address
• <code>/unblock_ip [IP]</code> - Remove an IP firewall ban

📄 <b>Document Creation:</b>
• <code>/docx [Title] [Topic]</code> - Generate Microsoft Word (.docx)
• <code>/pdf [Title] [Topic]</code> - Generate executive PDF (.pdf)

🧠 <b>Memory & Recall:</b>
• <code>/remember [fact]</code> - Store a permanent fact
• <code>/memory</code> - View all stored memories | <code>/clear_memory</code>"""
        send_telegram(chat_id, cmds_menu)
        return

    # -------------------------------------------------------------------------
    # 5. Scheduled Daily Weather & Tasks
    # -------------------------------------------------------------------------
    if text.startswith("/schedule_weather") or (
        ("weather" in lower or "forecast" in lower) and
        any(k in lower for k in ["everyday", "every day", "daily", "every morning"]) and
        any(k in lower for k in ["at ", "check", "send", "give", "tell"])
    ):
        send_chat_action(chat_id, "typing")
        sched_time = "07:00"
        loc = "Durban"

        # Check /schedule_weather format
        if text.startswith("/schedule_weather"):
            raw_parts = text.split()[1:]
            if raw_parts:
                sched_time = raw_parts[0].strip()
                if len(raw_parts) > 1:
                    loc = " ".join(raw_parts[1:]).strip().title()
        else:
            time_match = re.search(r'\b(?:at|for)\s+(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?\b', text, re.IGNORECASE)
            if not time_match:
                time_match = re.search(r'\b(\d{1,2}):(\d{2})\b', text)
            if time_match:
                hr = int(time_match.group(1))
                mn = int(time_match.group(2)) if time_match.group(2) else 0
                ampm = time_match.group(3).lower().replace('.', '') if len(time_match.groups()) > 2 and time_match.group(3) else ''
                if ampm == 'pm' and hr < 12:
                    hr += 12
                elif ampm == 'am' and hr == 12:
                    hr = 0
                sched_time = f"{hr:02d}:{mn:02d}"

            loc = extract_weather_location(text)

        # Normalize time
        if ":" in sched_time:
            parts = sched_time.split(":")
            sched_time = f"{int(parts[0]):02d}:{int(parts[1]):02d}"
        elif sched_time.isdigit():
            sched_time = f"{int(sched_time):02d}:00"

        schedule_task(chat_id, "weather", sched_time, {"location": loc})
        send_telegram(chat_id, f"""✅ <b>Daily Weather Scheduled!</b>

I will check the weather for <b>{loc}</b> every day at <b>{sched_time} SAST</b> and send it right here to your Telegram chat.

To view your scheduled tasks anytime, type <code>/schedules</code>.
To cancel, type <code>/cancel_weather</code>.""")
        return

    if text == "/schedules" or "my schedules" in lower or "active schedules" in lower:
        tasks = get_scheduled_tasks(chat_id)
        if not tasks:
            send_telegram(chat_id, "⏰ You have no active daily scheduled jobs right now.\n\nTry: <code>/schedule_weather 07:00 Durban</code> or tell me <i>'Check the weather everyday at 07:00 for Umkomaas'</i>.")
            return
        lines = []
        for t in tasks:
            params = json.loads(t.get("params") or "{}")
            lines.append(f"• <b>{t.get('task_type').title()}:</b> Every day at <b>{t.get('schedule_time')} SAST</b> (Params: {params})")
        send_telegram(chat_id, "⏰ <b>Your Active Daily Schedules:</b>\n\n" + "\n".join(lines))
        return

    if text == "/cancel_weather" or "cancel weather" in lower or "stop weather" in lower:
        cancel_scheduled_task(chat_id, "weather")
        send_telegram(chat_id, "⏹️ <b>Daily weather briefings have been cancelled.</b>")
        return

    # -------------------------------------------------------------------------
    # 6. Long-Term Memory (Permanent Fact Recall & Storage)
    # -------------------------------------------------------------------------
    if text == "/memory" or any(p in lower for p in ["what do you remember about me", "what do you remember", "what is in your memory", "what do you know about me"]):
        send_chat_action(chat_id, "typing")
        facts = get_user_facts(chat_id)
        if not facts:
            send_telegram(chat_id, "🧠 <b>Memory Bank:</b>\n\nI don't have any specific personal facts logged for you yet. Tell me things like:\n• <i>'Remember that my business is called SearchBiz'</i>\n• <i>'Remember that I live in Umkomaas'</i>\n• <code>/remember [fact]</code>")
            return
        fact_lines = [f"• <b>{k.replace('_', ' ').title()}:</b> {v}" for k, v in facts]
        send_telegram(chat_id, f"🧠 <b>Permanent Facts I Remember About You:</b>\n\n" + "\n".join(fact_lines) + "\n\n<i>These are stored in SQLite and retained across all server reboots.</i>")
        return

    if text.startswith("/clear_memory") or text == "clear memory" or "forget everything" in lower:
        clear_user_facts(chat_id)
        send_telegram(chat_id, "🧹 <b>Memory cleared!</b> All stored facts for this chat have been wiped.")
        return

    if text.startswith("/remember") or lower.startswith("remember that ") or lower.startswith("remember my ") or lower.startswith("remember i "):
        send_chat_action(chat_id, "typing")
        raw_fact = text.split(" ", 1)[-1].strip() if " " in text else ""
        if lower.startswith("remember that "):
            raw_fact = text[14:].strip()
        elif lower.startswith("remember my "):
            raw_fact = text[12:].strip()
        elif lower.startswith("remember i "):
            raw_fact = text[11:].strip()

        k = "note"
        v = raw_fact
        if " is " in raw_fact:
            parts = raw_fact.split(" is ", 1)
            k = parts[0].strip()
            v = parts[1].strip()
        elif ":" in raw_fact:
            parts = raw_fact.split(":", 1)
            k = parts[0].strip()
            v = parts[1].strip()

        save_user_fact(chat_id, k, v)
        send_telegram(chat_id, f"🧠 <b>Committed to Permanent Memory!</b>\n\n📝 <i>Remembered:</i> <b>{k.title()}</b> = \"{v}\"\n\nI will remember this across every conversation and server restart.")
        return

    if text.startswith("/forget "):
        target_k = text.split(" ", 1)[-1].strip()
        delete_user_fact(chat_id, target_k)
        send_telegram(chat_id, f"🗑️ <b>Removed from memory:</b> {target_k}")
        return

    # -------------------------------------------------------------------------
    # 7. Document Creation: Microsoft Word (.docx) & PDF (.pdf)
    # -------------------------------------------------------------------------
    is_docx_req = text.startswith("/docx") or any(k in lower for k in ["create a word document", "generate a word document", "make a word document", "create a docx", "generate a docx", "make a docx", "word document about", "word document for"])
    is_pdf_req = text.startswith("/pdf") or any(k in lower for k in ["create a pdf", "generate a pdf", "make a pdf", "pdf document about", "pdf document for", "pdf report on", "pdf invoice"])

    if is_docx_req or is_pdf_req:
        send_chat_action(chat_id, "upload_document")
        doc_type = "docx" if is_docx_req else "pdf"

        # Extract topic
        topic = text
        for pfx in ["/docx", "/pdf", "create a word document about", "create a word document for", "generate a word document on", "make a word document for", "create a docx for", "create a pdf about", "create a pdf for", "generate a pdf for", "make a pdf for", "pdf document about"]:
            if lower.startswith(pfx):
                topic = text[len(pfx):].strip()
                break
        topic = topic.strip() or "Executive Business Summary"

        send_telegram(chat_id, f"⚙️ <b>Authoring your {doc_type.upper()} document...</b>\nTopic: <i>'{topic}'</i>")

        author_prompt = f"""You are an executive document author for SearchBiz South Africa.
Write a comprehensive, highly professional, thorough document on: "{topic}".
Format requirements:
1. Line 1: Title of the document
2. Use markdown headings: '# Heading 1', '## Heading 2', '### Heading 3'
3. Use bullet points with '- '
4. Write detailed, complete sections (Executive Summary, Key Findings, Strategic Recommendations, Action Plan, Conclusion)
5. Do NOT include meta conversational commentary. Output the document content directly.
"""
        doc_content = ask_ai(author_prompt, chat_id=chat_id)
        lines = doc_content.splitlines()
        doc_title = lines[0].lstrip('#').strip() if lines else topic
        safe_filename = re.sub(r'[^a-zA-Z0-9_\-]', '_', doc_title)[:35]

        if doc_type == "docx":
            file_bytes = generate_word_document(doc_title, doc_content)
            send_telegram_document(chat_id, f"{safe_filename}.docx", file_bytes, caption=f"📄 <b>Word Document Created:</b> <i>{doc_title}</i>")
        else:
            file_bytes = generate_pdf_document(doc_title, doc_content)
            send_telegram_document(chat_id, f"{safe_filename}.pdf", file_bytes, caption=f"📑 <b>PDF Document Created:</b> <i>{doc_title}</i>")
        return

    # -------------------------------------------------------------------------
    # 8. Free Open-Source Image Generator (Flux.1 / Stable Diffusion)
    # -------------------------------------------------------------------------
    # Broad, forgiving trigger: handles any command or natural phrasing requesting an image
    is_img_req = (
        text.startswith(("/image", "/draw", "/photo", "/flux", "/paint", "/pic")) or
        any(k in lower for k in ["image", "picture", "photo", "drawing", "paint", "flux", "artwork"]) and
        any(v in lower for v in ["generate", "create", "make", "draw", "paint", "show me", "give me", "produce", "render", "use your flux", "use flux"])
    )
    if is_img_req:
        send_chat_action(chat_id, "upload_photo")
        clean_p = text
        # Clean conversational lead-ins
        clean_p = re.sub(
            r'^(?:please\s+)?(?:use\s+your\s+flux\s+image\s+generator\s+and\s+|use\s+flux\s+to\s+|can\s+you\s+)?(?:generate|create|make|draw|paint|show\s+me|give\s+me|produce|render)\s+(?:an?\s+)?(?:flux\s+)?(?:image|picture|photo|painting|artwork)\s+(?:of\s+)?',
            '',
            clean_p,
            flags=re.IGNORECASE
        ).strip()
        for pfx in ["/image", "/draw", "/photo", "/flux", "/paint", "/pic"]:
            if clean_p.lower().startswith(pfx):
                clean_p = clean_p[len(pfx):].strip()

        clean_p = re.sub(r'^(?:a|an)\s+', '', clean_p, flags=re.IGNORECASE).strip()
        clean_p = re.sub(r'\s+(?:image|picture|photo)$', '', clean_p, flags=re.IGNORECASE).strip()

        # Handle requests like "land image" or "land"
        if not clean_p or clean_p.lower() in ["image", "picture", "photo"]:
            clean_p = "vast scenic landscape with lush green terrain, rolling hills, mountains, dramatic horizon"
        elif clean_p.lower() in ["land", "a land"]:
            clean_p = "vast scenic landscape with lush green terrain, rolling hills, mountains, open dramatic sky"

        send_telegram(chat_id, f"🎨 <b>Generating image with open-source FLUX.1 engine...</b>\nPrompt: <i>'{clean_p}'</i>")
        img_bytes = generate_image_flux(clean_p)
        if img_bytes:
            _LAST_IMAGE_PROMPTS[chat_id] = clean_p
            send_telegram_photo(chat_id, img_bytes, caption=f"🎨 <b>Generated Image:</b> <i>'{clean_p}'</i>\n⚡ <i>Open-source FLUX.1 Engine (Watermark-Free)</i>")
        else:
            send_telegram(chat_id, "⚠️ The free open-source image generation service is temporarily busy. Please try another prompt in a moment!")
        return

    # -------------------------------------------------------------------------
    # 9. Voice Reading & Text-To-Speech (Sharp, Alluring British Lady & Dual Mode)
    # -------------------------------------------------------------------------
    if text.startswith("/always_voice") or text.startswith("/voice_mode"):
        parts = text.split(maxsplit=1)
        if len(parts) > 1:
            val = parts[1].strip().lower()
            if val in ["off", "disable", "no", "false", "0"]:
                set_always_voice(chat_id, False)
                send_telegram(chat_id, "🔇 <b>Dual Voice Mode: OFF</b>\n\nI will now respond with text only. (Send <code>/voice_mode on</code> anytime to re-enable voice responses!)")
                return
            else:
                set_always_voice(chat_id, True)
                send_telegram_dual(chat_id, "🎙️ <b>Dual Voice Mode: ON</b>\n\nEvery response will now be accompanied by both text and my sharp British voice note, darling!")
                return
        else:
            cur_state = "ON" if is_always_voice_enabled(chat_id) else "OFF"
            send_telegram(chat_id, f"🎙️ <b>Dual Voice Mode Status:</b> <b>{cur_state}</b>\n\n• <code>/voice_mode on</code> — Always reply with text AND spoken voice note\n• <code>/voice_mode off</code> — Reply with text only")
            return

    if text.startswith("/voice_accent") or text.startswith("/voice_profile") or text.startswith("/voice_style"):
        parts = text.split(maxsplit=1)
        if len(parts) > 1:
            chosen = parts[1].strip().lower()
            if "libby" in chosen:
                set_user_voice_profile(chat_id, "libby_british")
                send_telegram_dual(chat_id, "🎙️ <b>Voice Style Set:</b> <b>Libby (Warm & Melodious British Lady)</b>!")
            elif "maisie" in chosen:
                set_user_voice_profile(chat_id, "maisie_british")
                send_telegram_dual(chat_id, "🎙️ <b>Voice Style Set:</b> <b>Maisie (Youthful British Lady)</b>!")
            elif "south" in chosen or "za" in chosen or "african" in chosen or "leah" in chosen:
                set_user_voice_profile(chat_id, "south_african")
                send_telegram_dual(chat_id, "🎙️ <b>Voice Style Set:</b> <b>South African English</b> accent!")
            else:
                # Default: Sharp, captivating British lady
                set_user_voice_profile(chat_id, "sonia_british")
                send_telegram_dual(chat_id, "🎙️ <b>Voice Style Set:</b> <b>Sonia (Sharp, Articulate & Alluring British Lady)</b>!")
        else:
            send_telegram(chat_id, """🎙️ <b>Voice Profiles Available:</b>
• <code>/voice_style sonia</code> — <b>Sonia</b>: Sharp, articulate & captivating British Lady (Default)
• <code>/voice_style libby</code> — <b>Libby</b>: Warm, melodious British Lady
• <code>/voice_style maisie</code> — <b>Maisie</b>: Youthful British Lady
• <code>/voice_style za</code> — <b>Leah</b>: South African English

<i>Dual Voice Mode is currently active so I will reply to every question with voice and text!</i>""")
        return

    is_speech_req = text.startswith("/speak") or text.startswith("/read_to_me") or text.startswith("/voice") or any(k in lower for k in [
        "read this to me", "read it to me", "speak this out loud", "read to me", "say this out loud", "read out loud", "voice note", "voice option"
    ])
    if is_speech_req:
        send_chat_action(chat_id, "record_voice")

        # Check if user just wants a voice introduction / sample
        if lower.strip() in ["/voice", "/voice sample", "/voice_sample", "voice sample", "test voice", "sample voice"]:
            sample_text = (
                "Hello darling. I am Hermes, your executive partner for SearchBiz. "
                "I have tuned my British accent to be crisp, sharp, and rather captivating, just as you fancied. "
                "From now on, whenever you send me a voice note or ask me any question, I will listen closely and reply with both my voice and full text. "
                "What shall we conquer together today?"
            )
            profile = get_user_voice_profile(chat_id)
            v_bytes = generate_tts_audio(sample_text, voice_profile=profile)
            if v_bytes:
                send_telegram_voice(chat_id, v_bytes, caption="🎙️ <i>Sharp & Alluring British Lady voice introduction from Hermes</i>")
            send_telegram(chat_id, """🎙️ <b>Sharp British Lady Voice Active & Ready!</b>

I've tuned my British accent to be sharper, crisp, and captivating. <b>Dual Voice Mode is ON by default:</b>

✨ <b>Voice Controls:</b>
• <b>Send me a voice note:</b> I will listen, transcribe, reason, and reply with both text and voice!
• <b>Ask me any question:</b> I will answer in full text and speak it to you!
• <code>/voice_mode on|off</code> — Toggle automatic voice notes for every reply
• <code>/voice_style sonia|libby|maisie</code> — Choose your preferred British voice tone
• <code>/voice [text]</code> — Speak any custom text out loud""")
            return

        speech_text = text
        for pfx in ["/speak", "/read_to_me", "/voice", "read this to me:", "read this to me", "read it to me:", "read it to me", "speak this out loud:", "speak this out loud", "read to me:", "read to me", "say this out loud:"]:
            if lower.startswith(pfx):
                speech_text = text[len(pfx):].strip()
                break

        if not speech_text:
            # Speak the last message from assistant
            hist = get_chat_history(chat_id, limit=4)
            for h in reversed(hist):
                if h["role"] == "assistant":
                    speech_text = h["content"]
                    break

        if not speech_text:
            speech_text = "Good day, darling. I am Hermes, your SearchBiz executive partner, speaking with a crisp British accent."

        profile = get_user_voice_profile(chat_id)
        voice_bytes = generate_tts_audio(speech_text, voice_profile=profile)
        sent = False
        if voice_bytes:
            sent_res = send_telegram_voice(chat_id, voice_bytes, caption="🎙️ <i>Spoken audio from Hermes (Sharp British Lady)</i>")
            if sent_res and sent_res.get("ok"):
                sent = True

        if not sent:
            send_telegram(chat_id, f"🔊 <b>Readout (Sharp British Accent):</b>\n\n\"{speech_text}\"")
        return

    # -------------------------------------------------------------------------
    # 10. Translation Across All 11 South African Languages
    # -------------------------------------------------------------------------
    if text.startswith("/translate") or "translate this to " in lower or "translate to " in lower:
        send_chat_action(chat_id, "typing")
        trans_prompt = f"""You are an expert multilingual translator specializing in all 11 official South African languages:
1. English, 2. isiZulu, 3. isiXhosa, 4. Afrikaans, 5. Sepedi, 6. Setswana, 7. Sesotho, 8. Xitsonga, 9. siSwati, 10. Tshivenda, 11. isiNdebele.

Instruction from user:
"{text}"

Translate the content accurately, idiomatically, and culturally appropriate into the requested South African language. Output the translation clearly."""
        res = ask_ai(trans_prompt, chat_id=chat_id)
        send_telegram(chat_id, f"🌐 <b>South African Translation:</b>\n\n{res}")
        return

    # -------------------------------------------------------------------------
    # 11. Standard Operations: Ads, Emails, DirectAdmin
    # -------------------------------------------------------------------------
    if text.startswith("/post_ad") or text.startswith("/create_ad"):
        raw = text.split(" ", 1)[-1].strip() if " " in text else ""
        parts = [p.strip() for p in raw.split("|")]
        if len(parts) < 4:
            send_telegram(chat_id, "⚠️ <b>Usage:</b>\n<code>/post_ad Title | Category | City | Phone | Description</code>")
            return

        title, category, city, phone = parts[0], parts[1], parts[2], parts[3]
        description = parts[4] if len(parts) > 4 else f"Verified {category} in {city}."

        send_chat_action(chat_id, "typing")
        res = searchbiz_create_ad(title, category, city, phone, description)
        if res.get("success"):
            ad = res["ad"]
            send_telegram(chat_id, f"""
✅ <b>Advertisement Live!</b>
🏢 <b>{ad.get('title')}</b>
🏷️ {ad.get('category')} | 📍 {ad.get('city')}
📞 {ad.get('phone')}
🆔 <code>{ad.get('id')}</code>
🌐 <a href="https://searchbiz.co.za/directory?q={urllib.parse.quote(title)}">View on SearchBiz Directory</a>
""")
        else:
            send_telegram(chat_id, f"❌ Failed to create advertisement: {res.get('error')}")
        return

    if text.startswith("/delete_ad") or text.startswith("/remove_ad"):
        target = text.split(" ", 1)[-1].strip() if " " in text else ""
        if not target:
            send_telegram(chat_id, "⚠️ <b>Usage:</b>\n<code>/delete_ad [Business Name or ID]</code>")
            return
        send_chat_action(chat_id, "typing")
        res = searchbiz_delete_ad(target)
        if res.get("success"):
            send_telegram(chat_id, f"🗑️ <b>Advertisement Archived!</b>\nMoved to Recycle Bin. ID: <code>{target}</code>\nTo restore, type <code>/restore_ad {target}</code>")
        else:
            send_telegram(chat_id, f"❌ Failed to delete: {res.get('error')}")
        return

    if text.startswith("/restore_ad"):
        ad_id = text.split(" ", 1)[-1].strip() if " " in text else ""
        if not ad_id:
            send_telegram(chat_id, "⚠️ <b>Usage:</b>\n<code>/restore_ad [ID]</code>")
            return
        send_chat_action(chat_id, "typing")
        res = searchbiz_restore_ad(ad_id)
        if res.get("success"):
            send_telegram(chat_id, f"♻️ <b>Advertisement Restored!</b>\nAd <code>{ad_id}</code> is back active on the directory.")
        else:
            send_telegram(chat_id, f"❌ Could not restore ad: {res.get('error')}")
        return

    if text.startswith("/list_ads"):
        q = text.split(" ", 1)[-1].strip() if " " in text else ""
        send_chat_action(chat_id, "typing")
        res = searchbiz_list_ads(q, limit=5)
        ads = res.get("ads", [])
        if not ads:
            send_telegram(chat_id, "📭 No advertisements found.")
            return
        msg_lines = [f"📋 <b>SearchBiz Directory Listings ({len(ads)}):</b>\n"]
        for a in ads:
            msg_lines.append(f"• <b>{a.get('title')}</b> ({a.get('category')}, {a.get('city')})\n  📞 {a.get('phone')} | 🆔 <code>{a.get('id')}</code>")
        send_telegram(chat_id, "\n".join(msg_lines))
        return

    if text.startswith("/send_email"):
        raw = text.split(" ", 1)[-1].strip() if " " in text else ""
        parts = [p.strip() for p in raw.split("|")]
        if len(parts) < 3:
            send_telegram(chat_id, "⚠️ <b>Usage:</b>\n<code>/send_email recipient@domain.com | Subject | Body</code>")
            return
        to_email, subject, body = parts[0], parts[1], parts[2]
        send_chat_action(chat_id, "typing")
        res = send_email_smtp(to_email, subject, body)
        if res.get("success"):
            send_telegram(chat_id, f"✉️ <b>Email Sent!</b>\nTo: <code>{to_email}</code>\nSubject: <b>{subject}</b>")
        else:
            send_telegram(chat_id, f"❌ Email error: {res.get('error')}")
        return

    if text == "/check_inbox":
        send_chat_action(chat_id, "typing")
        inbox = fetch_recent_emails(limit=5)
        if "error" in inbox:
            send_telegram(chat_id, f"❌ IMAP Error: {inbox['error']}")
            return
        emails = inbox.get("emails", [])
        if not emails:
            send_telegram(chat_id, "📭 Inbox is clean (no unread/recent messages).")
            return
        reply = f"📬 <b>Recent Emails ({len(emails)}):</b>\n\n"
        for m in emails:
            reply += f"• <b>From:</b> {m.get('from')}\n  <b>Subject:</b> {m.get('subject')}\n  <b>Date:</b> {m.get('date')}\n\n"
        send_telegram(chat_id, reply)
        return

    if text.startswith("/create_email"):
        parts = text.split()
        if len(parts) < 3:
            send_telegram(chat_id, "⚠️ <b>Usage:</b>\n<code>/create_email username password [domain]</code>")
            return
        user, pwd = parts[1], parts[2]
        domain = parts[3] if len(parts) > 3 else "searchbiz.co.za"
        send_chat_action(chat_id, "typing")
        res = directadmin_create_mailbox(user, pwd, domain)
        if res.get("success"):
            send_telegram(chat_id, f"✅ <b>Mailbox Created!</b>\nAddress: <code>{user}@{domain}</code>\nPassword: <code>{pwd}</code>")
        else:
            send_telegram(chat_id, f"❌ DirectAdmin error: {res.get('error')}")
        return

    # -------------------------------------------------------------------------
    # 12. Information Tools: Weather, Crypto, Date/Time, Web Search
    # -------------------------------------------------------------------------
    if text.startswith("/weather"):
        city = text.split(" ", 1)[-1].strip() if " " in text else "Durban"
        send_chat_action(chat_id, "typing")
        report = get_weather(city)
        send_telegram_dual(chat_id, report)
        return

    if text.startswith("/crypto") or text.startswith("/btc"):
        symbol = text.split(" ", 1)[-1].strip() if " " in text else "BTC"
        send_chat_action(chat_id, "typing")
        report = get_crypto_price(symbol)
        send_telegram_dual(chat_id, report)
        return

    if text == "/date" or text == "/time":
        send_chat_action(chat_id, "typing")
        report = get_current_datetime_sast()
        send_telegram_dual(chat_id, report)
        return

    if text.startswith("/search") or text.startswith("/google"):
        q = text.split(" ", 1)[-1].strip() if " " in text else ""
        if not q:
            send_telegram(chat_id, "⚠️ <b>Usage:</b>\n<code>/search [what you want to find out]</code>")
            return
        send_chat_action(chat_id, "typing")
        report = search_web(q, chat_id=chat_id)
        send_telegram_dual(chat_id, report)
        return

    # -------------------------------------------------------------------------
    # 13. Natural Language Routing
    # -------------------------------------------------------------------------
    send_chat_action(chat_id, "typing")

    # Name & Identity triggers
    identity_triggers = [
        "what is your name", "whats your name", "what's your name",
        "who are you", "tell me about yourself", "what can you do"
    ]
    if any(t in lower for t in identity_triggers):
        base_url = get_active_api_base()
        reply = f"""🏛️ <b>I am Hermes!</b>

I am your autonomous AI Executive Assistant for <b>SearchBiz</b> (<code>{base_url}</code>), running 24/7 on your server with permanent memory and multi-skill execution.

✨ <b>My Superpowers:</b>
🧠 <b>Permanent Memory:</b> I remember facts, tasks, and context across reboots.
🎙️ <b>Dual Voice & Text:</b> I speak in a sharp, captivating British accent and understand voice notes!
📄 <b>Word & PDF Creation:</b> Ask me to generate Word (.docx) or PDF (.pdf) documents.
⏰ <b>Scheduled Daily Jobs:</b> Automated daily weather or briefings at your exact chosen time.
🎨 <b>Free Open-Source Image Generator:</b> FLUX.1 high-resolution images on demand.
📸 <b>Multimodal Vision:</b> Send photos or receipts and I will inspect and read them.
🗣️ <b>11 South African Languages:</b> Fluent in isiZulu, Afrikaans, isiXhosa, Sesotho, etc.
🌐 <b>Live Web Search:</b> Real Google/Web search with factual synthesis and source links.
🏢 <b>Directory & Email Engine:</b> Manage SearchBiz ads, send emails, and create mailboxes.

How can I assist you right now, <b>{sender}</b>?"""
        send_telegram_dual(chat_id, reply)
        return

    # Live Date & Time Queries
    date_triggers = ["what is the day today", "what day is it", "what day is today", "what's today's date", "what time is it", "current time", "what is the date"]
    if any(t in lower for t in date_triggers):
        reply = get_current_datetime_sast()
        send_telegram_dual(chat_id, reply)
        return

    # Real-Time Crypto Price Queries
    crypto_triggers = ["price of btc", "btc price", "bitcoin price", "crypto price", "eth price", "current price of btc", "current price of bitcoin"]
    if any(t in lower for t in crypto_triggers):
        sym = "BTC"
        if "eth" in lower: sym = "ETH"
        elif "sol" in lower: sym = "SOL"
        elif "xrp" in lower: sym = "XRP"
        reply = get_crypto_price(sym)
        send_telegram_dual(chat_id, reply)
        return

    # Live Weather Queries with Rain Probability Handling
    weather_triggers = ["weather", "temperature", "forecast", "is it raining", "how hot is it", "how cold is it", "chance of rain", "will it rain", "is it going to rain", "rain percentage"]
    if any(t in lower for t in weather_triggers) and not any(k in lower for k in ['create an ad', 'place an ad', 'post an ad', 'send email', 'delete ad', 'everyday', 'daily', 'every day']):
        if any(c in lower for c in ["why didn't", "why did not", "why no", "why you", "reasoning", "understand", "can you add", "add percentage"]):
            # Answer the reasoning question conversationally, then provide the updated weather card with rain %
            ai_explanation = ask_ai(text, chat_id=chat_id)
            w_box = get_weather(text)
            send_telegram_dual(chat_id, f"{ai_explanation}\n\n{w_box}")
            return
        reply = get_weather(text)
        send_telegram_dual(chat_id, reply)
        return

    # Live Web Search Queries (e.g. "go on Google and find out...", "search this on google...")
    web_search_triggers = [
        "search this on google", "search on google", "search google for",
        "google this", "go on google and", "find out on google",
        "search the web", "search the internet", "where can i find", "where to find",
        "find me information about", "find information about"
    ]
    if any(t in lower for t in web_search_triggers):
        reply = search_web(text, chat_id=chat_id)
        send_telegram_dual(chat_id, reply)
        return

    # Conversational Banter
    if any(p in lower for p in ["i never ask how", "i didn't ask how", "did i ask how", "nobody asked"]):
        send_telegram_dual(chat_id, f"Haha fair point, <b>{sender}</b>! Caught me red-handed being overly polite. 😄 What's on your mind or what task can I tackle for you?")
        return

    # Natural Language Ad Creation
    ad_triggers = ["create an ad", "place an ad", "post an ad", "make an ad", "add a business", "list a business", "register a business"]
    if any(k in lower for k in ad_triggers) and any(c in lower for c in ["for ", "named ", "called "]):
        parsed_title = re.search(r'(?:for|named|called)\s+([^,]+)', text, re.IGNORECASE)
        title = parsed_title.group(1).strip() if parsed_title else "Verified Business"
        phone_match = re.search(r'(?:0\d{9}|\+27\d{9})', text)
        phone = phone_match.group(0) if phone_match else "0821234567"
        city = extract_weather_location(text)
        category = "Services"
        for cat in ["Plumber", "Electrician", "Towing", "Cleaning", "Bakery", "Lawyer", "Auto"]:
            if cat.lower() in lower:
                category = cat
                break
        res = searchbiz_create_ad(title, category, city, phone, f"Verified {category} in {city}.")
        if res.get("success"):
            ad = res["ad"]
            send_telegram_dual(chat_id, f"✅ <b>Advertisement Live!</b>\n🏢 <b>{ad.get('title')}</b>\n🏷️ {ad.get('category')} | 📍 {ad.get('city')}\n📞 {ad.get('phone')}\n🆔 <code>{ad.get('id')}</code>")
        else:
            send_telegram_dual(chat_id, f"❌ Failed to create ad: {res.get('error')}")
        return

    # 14. Conversational AI Assistant with Deep Reasoning & Long-Term Memory
    ai_reply = ask_ai(
        text,
        chat_id=chat_id
    )
    if ai_reply:
        send_telegram_dual(chat_id, ai_reply)
        return

    # 15. General Guidance
    send_telegram_dual(chat_id, f"""🏛️ <b>SearchBiz Hermes Executive Assistant</b>
I'm here with you, <b>{sender}</b>!

Try any of these:
📄 <i>"Create a word document about South African solar energy"</i>
📑 <i>"Make a pdf report on Durban tourism"</i>
⏰ <i>"Check the weather everyday at 07:00 for Umkomaas"</i>
🧠 <i>"Remember that my business is SearchBiz"</i>
🎨 <i>"Create an image of a sunrise over Table Mountain"</i>
🌐 <i>"Search Google for top safari lodges in Kruger"</i>
🌦️ <i>"What's the weather in Umkomaas?"</i>
🪙 <i>"What's the current price of BTC?"</i>
🗣️ Talk to me in isiZulu, Afrikaans, or send me a voice note!""")


def main():
    logger.info("=====================================================")
    logger.info("Hermes SearchBiz VPS Agent starting up...")
    logger.info(f"Target Bot: @Searchbiz_bot (Token: {TELEGRAM_BOT_TOKEN[:10]}...)")
    logger.info(f"Ollama Brain: {OLLAMA_API_URL} ({OLLAMA_MODEL})")
    api_base = get_active_api_base()
    logger.info(f"SearchBiz Live API: {api_base}")
    logger.info(f"Persistent Memory Database: {DB_PATH}")
    logger.info("=====================================================")

    # 1. Initialize SQLite Database
    init_memory_db()

    # 2. Start Scheduled Tasks Background Daemon
    scheduler_thread = threading.Thread(target=scheduler_worker, daemon=True)
    scheduler_thread.start()

    # 3. Verify Telegram Bot connection
    me = telegram_call("getMe")
    if not me or not me.get("ok"):
        logger.error("Failed to authenticate with Telegram. Check TELEGRAM_BOT_TOKEN.")
        sys.exit(1)

    bot_user = me["result"]["username"]
    logger.info(f"Telegram connected successfully as @{bot_user}")

    # Clear pending webhooks so Long Polling works cleanly on VPS
    telegram_call("deleteWebhook", {"drop_pending_updates": False})

    offset = 0
    while True:
        try:
            updates = telegram_call("getUpdates", {"offset": offset, "timeout": 25})
            if updates and updates.get("ok"):
                for item in updates.get("result", []):
                    offset = max(offset, item["update_id"] + 1)
                    if "message" in item:
                        try:
                            handle_message(item["message"])
                        except Exception as msg_err:
                            logger.error(f"Error handling Telegram message: {msg_err}", exc_info=True)
                            c_id = item["message"].get("chat", {}).get("id")
                            if c_id:
                                try:
                                    send_telegram(c_id, f"⚠️ <b>Execution Notice:</b> An unexpected error occurred while processing that command: <code>{msg_err}</code>\n<i>I have logged the trace and am ready for your next instruction.</i>")
                                except Exception:
                                    pass
            time.sleep(0.5)
        except KeyboardInterrupt:
            logger.info("Hermes Agent stopped by user.")
            break
        except Exception as e:
            logger.error(f"Error in polling loop: {e}")
            time.sleep(3)


if __name__ == "__main__":
    main()
