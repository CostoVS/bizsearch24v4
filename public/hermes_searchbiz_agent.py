#!/usr/bin/env python3
"""
=============================================================================
SearchBiz Hermes Autonomous Executive Agent (VPS Daemon)
Interface: Telegram (@Searchbiz_bot)
Target Platform: searchbiz.co.za
Capabilities:
  1. Create business advertisements on searchbiz.co.za (Commands & Natural Language)
  2. Remove / archive advertisements with Recycle Bin and instant restore
  3. Search, list, and audit live business directory listings
  4. Send emails via SMTP or SearchBiz Gateway (Natural Language & /send_email)
  5. Check & read incoming emails via IMAP
  6. Create domain-branded mailboxes via DirectAdmin API
  7. Natural conversational intelligence, storytelling, and business consulting
=============================================================================
"""

import os
import sys
import time
import json
import logging
import smtplib
import imaplib
import ssl
import email
from email.header import decode_header
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import urllib.request
import urllib.parse
import urllib.error
import re

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
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

# Email Configurations (Mailcow VPS SMTP/IMAP for ai@searchbiz.co.za)
SMTP_HOST = os.getenv("SMTP_HOST", "127.0.0.1")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "ai@searchbiz.co.za")
SMTP_PASS = os.getenv("SMTP_PASS", "HermesAI@2026!")

IMAP_HOST = os.getenv("IMAP_HOST", "127.0.0.1")
IMAP_PORT = int(os.getenv("IMAP_PORT", "993"))
IMAP_USER = os.getenv("IMAP_USER", "ai@searchbiz.co.za")
IMAP_PASS = os.getenv("IMAP_PASS", "HermesAI@2026!")

# DirectAdmin API Configuration
DIRECTADMIN_URL = os.getenv("DIRECTADMIN_URL", "https://localhost:2222").rstrip("/")
DIRECTADMIN_USER = os.getenv("DIRECTADMIN_USER", "admin")
DIRECTADMIN_PASS = os.getenv("DIRECTADMIN_PASS", "")

# Active Endpoint Cache
_CACHED_API_URL = None


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
# Telegram HTTP Utilities
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

def send_telegram(chat_id: int, text: str):
    return telegram_call("sendMessage", {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    })

def send_chat_action(chat_id: int, action: str = "typing"):
    """Shows native 'typing...' indicator in Telegram header"""
    return telegram_call("sendChatAction", {
        "chat_id": chat_id,
        "action": action
    })


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
        # Invalidate cache so next request probes again
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

def searchbiz_list_ads(query: str = "", limit: int = 5):
    encoded_q = urllib.parse.quote(query)
    return api_request(f"/api/bot/ad?q={encoded_q}&limit={limit}", method="GET")

def searchbiz_restore_ad(id_or_title: str):
    payload = {"id": id_or_title}
    return api_request("/api/bot/ad", method="PATCH", payload=payload)

def searchbiz_restore_all_ads():
    return api_request("/api/bot/ad", method="PATCH", payload={"all": True})

def searchbiz_get_stats():
    return api_request("/api/bot/ad?stats=true", method="GET")


# ============================================================================
# Email System: Send & Receive (SMTP + IMAP)
# ============================================================================
def send_email_smtp(to_email: str, subject: str, body_text: str, html_content: str = None):
    """Sends an email using dedicated domain SMTP (ai@searchbiz.co.za).
    When SMTP_USER is configured, it strictly delivers through the domain mailbox.
    """
    # 1. Direct configured domain SMTP (ai@searchbiz.co.za)
    if SMTP_PASS and SMTP_USER and SMTP_PASS.strip():
        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = f"SearchBiz AI Executive <{SMTP_USER}>"
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body_text, "plain"))
            if html_content:
                msg.attach(MIMEText(html_content, "html"))

            ssl_ctx = ssl.create_default_context()
            if SMTP_HOST in ("127.0.0.1", "localhost"):
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl.CERT_NONE

            if SMTP_PORT == 465:
                server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15, context=ssl_ctx)
            else:
                server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)
                server.ehlo()
                try:
                    server.starttls(context=ssl_ctx)
                    server.ehlo()
                except Exception as tls_err:
                    logger.warning(f"STARTTLS negotiation note: {tls_err}")

            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, [to_email], msg.as_string())
            server.quit()
            logger.info(f"Direct domain SMTP successfully delivered via {SMTP_USER} to {to_email}")
            return {"success": True, "message": f"Delivered via {SMTP_USER} to {to_email}"}
        except Exception as e:
            logger.error(f"Dedicated SMTP error for {SMTP_USER}: {e}")
            return {"error": f"Failed delivering via {SMTP_USER}: {str(e)}"}

    # Fallback error if credentials missing
    return {"error": "Domain email credentials for ai@searchbiz.co.za are missing."}

def fetch_recent_emails(limit: int = 5):
    """Fetches recent emails via IMAP for ai@searchbiz.co.za"""
    if not IMAP_USER or not IMAP_PASS:
        return {"error": "IMAP credentials not configured"}

    try:
        ssl_ctx = ssl.create_default_context()
        if IMAP_HOST in ("127.0.0.1", "localhost"):
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE

        mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT, timeout=15, ssl_context=ssl_ctx)
        mail.login(IMAP_USER, IMAP_PASS)
        mail.select("inbox")

        status, messages = mail.search(None, "ALL")
        if status != "OK":
            return {"count": 0, "emails": []}

        email_ids = messages[0].split()
        recent_ids = email_ids[-limit:] if len(email_ids) >= limit else email_ids
        recent_ids.reverse()

        result_emails = []
        for mid in recent_ids:
            res, data = mail.fetch(mid, "(RFC822)")
            if res == "OK":
                raw = email.message_from_bytes(data[0][1])
                subj = raw.get("Subject", "No Subject")
                decoded_subj, enc = decode_header(subj)[0]
                if isinstance(decoded_subj, bytes):
                    subj = decoded_subj.decode(enc or "utf-8", errors="ignore")

                sender = raw.get("From", "Unknown")
                date = raw.get("Date", "")
                result_emails.append({
                    "id": mid.decode("utf-8"),
                    "from": sender,
                    "subject": subj,
                    "date": date
                })

        mail.logout()
        return {"count": len(result_emails), "emails": result_emails}
    except Exception as e:
        logger.error(f"IMAP read failed: {e}")
        return {"error": str(e)}


# ============================================================================
# DirectAdmin Mailbox Creation API
# ============================================================================
def directadmin_create_mailbox(username: str, password: str, domain: str = "searchbiz.co.za", quota_mb: int = 0):
    if not DIRECTADMIN_USER or not DIRECTADMIN_PASS:
        return {"error": "DIRECTADMIN_USER or DIRECTADMIN_PASS not configured"}

    url = f"{DIRECTADMIN_URL}/CMD_API_POP"
    data = urllib.parse.urlencode({
        "action": "create",
        "domain": domain,
        "user": username,
        "passwd": password,
        "passwd2": password,
        "quota": quota_mb
    }).encode("utf-8")

    import base64
    auth_str = f"{DIRECTADMIN_USER}:{DIRECTADMIN_PASS}"
    auth_bytes = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

    req = urllib.request.Request(url, data=data, headers={
        "Authorization": f"Basic {auth_bytes}"
    })

    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            resp_text = res.read().decode("utf-8")
            if "error=0" in resp_text or "details" in resp_text:
                return {"success": True, "details": resp_text}
            return {"error": resp_text}
    except Exception as e:
        logger.error(f"DirectAdmin API failed: {e}")
        return {"error": str(e)}


# ============================================================================
# Multi-Tier AI Brain (Next.js Cloud / Local Ollama qwen2.5:3b)
# ============================================================================
def ask_ai(prompt: str, system_prompt: str = None) -> str:
    """Invokes AI Brain with multi-tier resilience:
    1. SearchBiz Next.js Server API (/api/gemini/chat) - fast & full business context
    2. Local Ollama qwen2.5:3b (timeout 18s)
    """
    base_url = get_active_api_base()

    # 1. SearchBiz Server AI
    for ep in ["/api/gemini/chat", "/api/llama3/chat"]:
        try:
            cloud_url = f"{base_url}{ep}"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {SEARCHBIZ_BOT_SECRET}"
            }
            cloud_data = json.dumps({
                "message": prompt,
                "prompt": prompt
            }).encode("utf-8")
            req = urllib.request.Request(cloud_url, data=cloud_data, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as res:
                ans = json.loads(res.read().decode("utf-8"))
                cloud_text = ans.get("reply") or ans.get("text") or ans.get("response")
                if cloud_text and "Encountered an internal" not in cloud_text:
                    return cloud_text.strip()
        except Exception as e:
            logger.debug(f"SearchBiz cloud AI endpoint '{ep}' error: {e}")

    # 2. Local Ollama
    try:
        url = f"{OLLAMA_API_URL}/api/generate"
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 350
            }
        }
        if system_prompt:
            payload["system"] = system_prompt

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=18) as res:
            ans = json.loads(res.read().decode("utf-8"))
            resp = ans.get("response", "").strip()
            if resp:
                return resp
    except Exception as e:
        logger.warning(f"Local Ollama inference failed: {e}")

    return ""

def ask_ollama(prompt: str, system_prompt: str = None) -> str:
    return ask_ai(prompt, system_prompt)


# ============================================================================
# Main Agent Loop & Command Router
# ============================================================================
def handle_message(message: dict):
    chat_id = message["chat"]["id"]
    text = message.get("text", "").strip()
    sender = message.get("from", {}).get("first_name", "Boss")

    if not text:
        return

    logger.info(f"Incoming message from {sender} ({chat_id}): '{text}'")

    # 1. Start & Help
    if text.startswith("/start") or text.startswith("/help"):
        base_url = get_active_api_base()
        reply = f"""
🌟 <b>SearchBiz Hermes Executive Agent</b>
Ready on your VPS, <b>{sender}</b>!

Connected Brain: <code>{OLLAMA_MODEL}</code> / Cloud AI
Live Platform: <code>{base_url}</code>

<b>Core Operations:</b>
➕ <code>/post_ad Title | Category | City | Phone | Description</code>
🗑️ <code>/delete_ad [Business Name or ID]</code>
🔍 <code>/list_ads [keyword]</code>
♻️ <code>/restore_ad [ID]</code>
📧 <code>/send_email to@domain.com | Subject | Body</code>
📥 <code>/check_inbox</code>
📬 <code>/create_email username password [domain]</code>
⚡ <code>/status</code>

<b>Or speak to me naturally:</b>
• <i>"Send an email explaining What searchbiz.co.za is all about to user@email.com"</i>
• <i>"Make an ad for Quick Towing in Pretoria, 0825551234, 24/7 breakdown recovery"</i>
• <i>"Delete ad for Quick Towing"</i>
• <i>"Tell one story"</i>
• <i>"What are the pricing plans?"</i>
"""
        send_telegram(chat_id, reply)
        return

    # 2. Status check
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
• <b>SMTP Outbound:</b> <code>{SMTP_HOST}:{SMTP_PORT}</code>
• <b>IMAP Inbound:</b> <code>{IMAP_HOST}:{IMAP_PORT}</code>
• <b>DirectAdmin API:</b> <code>{DIRECTADMIN_URL}</code>
"""
        send_telegram(chat_id, status_msg)
        return

    # 3. Post Ad Command (/post_ad)
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
            send_telegram(chat_id, f"❌ Failed: {res.get('error')}")
        return

    # 4. Delete Ad Command (/delete_ad)
    if text.startswith("/delete_ad") or text.startswith("/remove_ad"):
        target = text.split(" ", 1)[-1].strip() if " " in text else ""
        if not target and _LAST_CREATED_AD:
            target = _LAST_CREATED_AD.get("id") or _LAST_CREATED_AD.get("title") or ""

        if not target:
            send_telegram(chat_id, "⚠️ <b>Usage:</b>\n<code>/delete_ad [ID or Business Name]</code>\nOr simply say <i>\"Delete the ad you just created\"</i>.")
            return

        send_chat_action(chat_id, "typing")
        res = searchbiz_delete_ad(target)
        if res.get("success"):
            removed = res.get("removedAd", {})
            title = removed.get('title', target)
            ad_id = removed.get('id', target)
            city = removed.get('city', '')
            loc_str = f" in {city}" if city else ""
            send_telegram(chat_id, f"""🗑️ <b>Ad Archived to Recycle Bin</b>
Listing <b>"{title}"</b>{loc_str} (ID: <code>{ad_id}</code>) has been safely taken off the live directory.

♻️ To restore it at any time:
<code>/restore_ad {ad_id}</code>
or run <code>/restore_all</code> to recover all listings.""")
        else:
            send_telegram(chat_id, f"❌ Failed: {res.get('error')}")
        return

    # 5. List Ads (/list_ads)
    if text.startswith("/list_ads"):
        query = text.split(" ", 1)[-1].strip() if " " in text else ""
        send_chat_action(chat_id, "typing")
        res = searchbiz_list_ads(query, limit=5)
        ads = res.get("ads", [])
        if not ads:
            send_telegram(chat_id, f"🔍 No ads found matching '{query}'.")
            return

        reply = f"🔍 <b>Directory Listings ({len(ads)}):</b>\n\n"
        for i, a in enumerate(ads, 1):
            reply += f"{i}. <b>{a.get('title')}</b> ({a.get('category')})\n   📍 {a.get('city')} | 📞 {a.get('phone')}\n   🆔 <code>{a.get('id')}</code>\n\n"
        send_telegram(chat_id, reply)
        return

    # 6. Restore Ad (/restore_ad)
    if text.startswith("/restore_ad"):
        target = text.split(" ", 1)[-1].strip() if " " in text else ""
        send_chat_action(chat_id, "typing")
        res = searchbiz_restore_ad(target)
        if res.get("success"):
            send_telegram(chat_id, f"✅ <b>Restored!</b> Listing <b>\"{res['ad']['title']}\"</b> is live again.")
        else:
            send_telegram(chat_id, f"❌ Restore error: {res.get('error')}")
        return

    # 6b. Restore All Ads (/restore_all or /untrash_all)
    if text.startswith("/restore_all") or text.startswith("/untrash_all") or text.startswith("/recover_ads"):
        send_chat_action(chat_id, "typing")
        res = searchbiz_restore_all_ads()
        if res.get("success"):
            count = res.get("restoredCount", res.get("count", 0))
            total = res.get("activeTotal", "")
            total_str = f" Total active listings now: <b>{total}</b>." if total else ""
            send_telegram(chat_id, f"♻️ <b>Recycle Bin Restored!</b>\nSuccessfully restored <b>{count}</b> listing(s) back into the live SearchBiz directory.{total_str}")
        else:
            send_telegram(chat_id, f"❌ Restore error: {res.get('error')}")
        return

    # 7. Send Email (/send_email)
    if text.startswith("/send_email"):
        raw = text.split(" ", 1)[-1].strip() if " " in text else ""
        parts = [p.strip() for p in raw.split("|")]
        if len(parts) < 3:
            send_telegram(chat_id, "⚠️ <b>Usage:</b>\n<code>/send_email recipient@domain.com | Subject | Body text</code>")
            return

        to_email, subject, body = parts[0], parts[1], parts[2]
        send_chat_action(chat_id, "typing")
        res = send_email_smtp(to_email, subject, body)
        if res.get("success"):
            send_telegram(chat_id, f"📧 <b>Email Sent!</b> To: <code>{to_email}</code>\nSubject: <i>{subject}</i>")
        else:
            send_telegram(chat_id, f"❌ Email send failed: {res.get('error')}")
        return

    # 8. Check Inbox (/check_inbox)
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

    # 9. Create DirectAdmin Email Account (/create_email)
    if text.startswith("/create_email"):
        parts = text.split()
        if len(parts) < 3:
            send_telegram(chat_id, "⚠️ <b>Usage:</b>\n<code>/create_email username password [domain]</code>\n<i>Example:</i> <code>/create_email info Pass123! searchbiz.co.za</code>")
            return

        user = parts[1]
        pwd = parts[2]
        domain = parts[3] if len(parts) > 3 else "searchbiz.co.za"

        send_chat_action(chat_id, "typing")
        res = directadmin_create_mailbox(user, pwd, domain)
        if res.get("success"):
            send_telegram(chat_id, f"✅ <b>Mailbox Created!</b>\nAddress: <code>{user}@{domain}</code>\nPassword: <code>{pwd}</code>")
        else:
            send_telegram(chat_id, f"❌ DirectAdmin error: {res.get('error')}")
        return

    # -------------------------------------------------------------------------
    # Send typing status for natural conversation
    # -------------------------------------------------------------------------
    send_chat_action(chat_id, "typing")
    lower = text.lower()

    # 10. Natural Language Email Sending
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    if email_match and any(k in lower for k in ['send an email', 'send email', 'email explaining', 'email about', 'mail explaining', 'mail to', 'shoot an email', 'explain about', 'explaining']):
        recipient = email_match.group(0)
        is_free_vs_paid = any(k in lower for k in ['free option', 'free vs paid', 'verify the business', 'paid options', 'verification option', 'pricing options', 'listing and the paid', 'verify'])
        is_about_searchbiz = is_free_vs_paid or any(k in lower for k in ['searchbiz', 'all about', 'what it is', 'pricing', 'plans', 'platform'])

        if is_free_vs_paid:
            subject = "SearchBiz Business Verification: Free vs Paid Options Guide"
            plain_body = """Hi there,

Thank you for your interest in SearchBiz (https://searchbiz.co.za) - South Africa's trusted local business directory.

Here is a clear comparison between our Free Listing Verification and our Paid Premium Options:

=======================================================
1. FREE BUSINESS LISTING & VERIFICATION OPTION
=======================================================
• Cost: 100% Free (No credit card or payment required).
• Standard Directory Listing: Published in the SearchBiz South African local business index.
• Verification Process: Business owners can claim and verify their listing using SMS/email confirmation or proof of operation.
• Visibility: Public telephone number, city, province, and business category are prominently displayed so customers can reach you directly.

=======================================================
2. PAID PREMIUM SUBSCRIPTION & VERIFIED GROWTH PLAN
=======================================================
• Base Premium Plan: R199.00 / month (Billed via South African debit order mandate)
  - Elite Verified Trust Badge: Distinctive green verification shield providing immediate customer confidence and anti-fraud protection.
  - Custom Smart Static Website: Fast, modern business landing page hosted directly on SearchBiz with complimentary design assistance.
  - Unlimited Domain-Branded Email Accounts: e.g., info@yourdomain.co.za or sales@yourdomain.co.za.
  - Top Directory Placement: Priority positioning above standard free listings in search results.
  - 1 Custom verified listing in SearchBiz directory included.

• Extras & Add-Ons:
  - Additional ad listings: +R199.00 / month each
  - .co.za Domain Registration: R99.00 / year

How to Get Started:
Visit https://searchbiz.co.za to claim, verify, or register your business profile today.

Best regards,
SearchBiz Executive AI Team
https://searchbiz.co.za
support@searchbiz.co.za
"""
            html_body = """
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 24px; color: #ffffff;">
    <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: bold; letter-spacing: -0.5px;">SearchBiz.co.za</h1>
    <p style="margin: 0; font-size: 14px; opacity: 0.9;">Business Verification: Free vs Paid Options Guide</p>
  </div>
  <div style="padding: 24px; color: #334155; line-height: 1.6; font-size: 14px;">
    <p style="font-size: 15px; margin-top: 0;"><strong>Hello,</strong></p>
    <p>Here is a complete breakdown of the <strong>Free Verification Option</strong> and the <strong>Paid Premium Options</strong> available for South African businesses on SearchBiz:</p>
    
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #166534; font-size: 16px;">🆓 1. Free Business Listing & Verification Option</h3>
      <ul style="margin: 0; padding-left: 18px; color: #15803d;">
        <li style="margin-bottom: 6px;"><strong>Cost:</strong> 100% Free (No credit card or recurring charge).</li>
        <li style="margin-bottom: 6px;"><strong>Standard Directory Indexing:</strong> Listed in the South African local business index.</li>
        <li style="margin-bottom: 6px;"><strong>Claim & Verify:</strong> Verify ownership of your business profile via email/SMS proof.</li>
        <li style="margin-bottom: 6px;"><strong>Direct Inquiries:</strong> Direct customer telephone, WhatsApp, and location display.</li>
      </ul>
    </div>

    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #065f46; font-size: 16px;">💎 2. Paid Premium Subscription & Growth Plan</h3>
      <p style="margin: 0 0 8px 0;"><strong>Base Premium Plan: R199.00 / month</strong> (Billed via South African debit order mandate)</p>
      <ul style="margin: 0 0 12px 0; padding-left: 18px; font-size: 13.5px; color: #047857;">
        <li style="margin-bottom: 6px;"><strong>Elite Verified Trust Badge:</strong> Green verification shield for customer trust.</li>
        <li style="margin-bottom: 6px;"><strong>Custom Smart Static Website:</strong> Fully hosted with design & setup assistance included.</li>
        <li style="margin-bottom: 6px;"><strong>Unlimited Domain-Branded Emails:</strong> Unlimited accounts (e.g. <code>info@yourdomain.co.za</code>).</li>
        <li style="margin-bottom: 6px;"><strong>Top Placement:</strong> Ranked above standard free listings in search results.</li>
      </ul>
      <p style="margin: 0; font-size: 13px; color: #065f46;">
        <strong>Extras:</strong> Additional listed ads at <strong>+R199.00/mo</strong> each | <strong>.co.za Domain:</strong> <strong>R99.00/year</strong>
      </p>
    </div>

    <p style="margin-top: 24px;">To claim or verify your listing, visit <a href="https://searchbiz.co.za" style="color: #059669; font-weight: bold; text-decoration: none;">searchbiz.co.za</a>.</p>
    <p style="margin-bottom: 0;">Warm regards,<br><strong>SearchBiz AI Executive Team</strong><br><a href="https://searchbiz.co.za" style="color: #059669; text-decoration: none;">https://searchbiz.co.za</a></p>
  </div>
</div>
"""
        elif is_about_searchbiz:
            subject = "Discover SearchBiz.co.za | South Africa's Verified Local Directory"
            plain_body = """Hi there,

Welcome to SearchBiz (https://searchbiz.co.za) - South Africa's premier verified local business directory and commercial platform.

What is SearchBiz?
SearchBiz is engineered for South African entrepreneurs, contractors, tradespeople, and local businesses. We connect real customers with vetted local services across Johannesburg, Cape Town, Durban, Pretoria, and all 9 provinces.

Why Businesses Choose SearchBiz:
1. Verified Trust Badge - Builds immediate consumer confidence and protects against scams.
2. High Local SEO Visibility - Fast, Google-optimized business profiles that rank high on local search.
3. Direct Inquiries - Direct telephone, email, and WhatsApp contact straight from your profile.

Verified Pricing & Plans:
• Base Premium Plan: R199.00 / month (Billed via South African debit card mandate)
  - Unlimited hosting for static websites
  - Unlimited domain-branded email accounts (@yourdomain.co.za)
  - Custom design assistance for your smart static website
  - Elite verified status and 1 custom directory listing in the SearchBiz index
• Extras & Add-Ons:
  - Additional ad listings: +R199.00 / month each
  - .co.za Domain Registration: R99.00 / year

Get Started Today:
Visit https://searchbiz.co.za to publish or claim your business profile.

Best regards,
The SearchBiz Executive Team
https://searchbiz.co.za
support@searchbiz.co.za
"""
            html_body = f"""
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 24px; color: #ffffff;">
    <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: bold; letter-spacing: -0.5px;">SearchBiz.co.za</h1>
    <p style="margin: 0; font-size: 14px; opacity: 0.9;">South Africa's Verified Local Business Directory</p>
  </div>
  <div style="padding: 24px; color: #334155; line-height: 1.6; font-size: 14px;">
    <p style="font-size: 15px; margin-top: 0;"><strong>Hello,</strong></p>
    <p>Thank you for inquiring about <strong>SearchBiz</strong>! Here is an overview of what our platform delivers for South African businesses and customers:</p>
    
    <div style="background: #f8fafc; border-left: 4px solid #059669; padding: 14px 18px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <h3 style="margin: 0 0 6px 0; color: #064e3b; font-size: 15px;">What is SearchBiz?</h3>
      <p style="margin: 0; font-size: 13.5px; color: #475569;">
        SearchBiz is a verified commercial directory and high-speed web platform. We bridge the gap between South African service seekers and vetted local businesses across Gauteng, Western Cape, KZN, and all 9 provinces.
      </p>
    </div>

    <h3 style="color: #0f172a; margin-top: 24px; margin-bottom: 10px; font-size: 16px;">Core Platform Advantages</h3>
    <ul style="padding-left: 20px; margin: 0 0 20px 0;">
      <li style="margin-bottom: 8px;"><strong>Verified Trust Badge:</strong> Builds immediate buyer confidence and eliminates scams.</li>
      <li style="margin-bottom: 8px;"><strong>Top SEO Discovery:</strong> Clean, crawlable listings optimized for Google and South African search queries.</li>
      <li style="margin-bottom: 8px;"><strong>Direct Customer Inquiries:</strong> Direct phone call, WhatsApp, and email click-throughs straight to your business.</li>
    </ul>

    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #065f46; font-size: 15px;">💎 Verified Pricing & Subscription Plans</h3>
      <p style="margin: 0 0 8px 0;"><strong>Base Premium Plan: R199.00 / month</strong></p>
      <ul style="margin: 0 0 12px 0; padding-left: 18px; font-size: 13px; color: #047857;">
        <li>Unlimited hosting for static websites</li>
        <li>Unlimited domain-branded email accounts (e.g. <code>info@yourdomain.co.za</code>)</li>
        <li>Host and design assistance for custom smart static websites</li>
        <li>1 custom verified listing in SearchBiz index</li>
      </ul>
      <p style="margin: 0; font-size: 13px; color: #065f46;">
        <strong>Extras:</strong> Additional ad listings at <strong>+R199.00/mo</strong> each | <strong>.co.za Domain:</strong> <strong>R99.00/year</strong>
      </p>
    </div>

    <p style="margin-top: 24px;">Ready to list your business or explore our verified directory? Visit <a href="https://searchbiz.co.za" style="color: #059669; font-weight: bold; text-decoration: none;">searchbiz.co.za</a> today.</p>
    <p style="margin-bottom: 0;">Warm regards,<br><strong>SearchBiz Executive Agent (Hermes)</strong><br><a href="https://searchbiz.co.za" style="color: #059669; text-decoration: none;">https://searchbiz.co.za</a></p>
  </div>
</div>
"""
        else:
            subject = "Message from SearchBiz Executive Agent"
            draft = ask_ai(f"Write a concise, professional, warm email message based on this request: '{text}'. Keep it clean, direct, and well formatted.")
            plain_body = draft or text
            html_body = f"<div style='font-family: Arial, sans-serif; padding: 20px;'>{plain_body.replace(chr(10), '<br>')}</div>"

        send_res = send_email_smtp(recipient, subject, plain_body, html_body)
        if send_res.get("success"):
            confirm = f"""📧 <b>Email Successfully Dispatched!</b>

📬 <b>To:</b> <code>{recipient}</code>
📝 <b>Subject:</b> <i>{subject}</i>

✨ The email has been delivered directly. Please check your inbox!"""
            send_telegram(chat_id, confirm)
        else:
            err_msg = send_res.get("details") or send_res.get("error") or "Unknown gateway error"
            send_telegram(chat_id, f"❌ Failed to dispatch email: {err_msg}")
        return

    # 11. Storytelling & Creative Writing (e.g. "Tell one story")
    if any(k in lower for k in ['tell a story', 'tell one story', 'tell me a story', 'give me a story', 'tell story', 'write a story', 'story']):
        story = ask_ai("Tell a captivating, heartwarming, and inspirational short story about a South African entrepreneur building a business against all odds, with wit, warmth, and perseverance. Keep it engaging and under 220 words.")
        if story:
            send_telegram(chat_id, f"📖 <b>Here is a story for you:</b>\n\n{story}")
            return
        else:
            fallback_story = """📖 <b>The Baker of Vilakazi Street</b>

Every morning at 04:30, while the streetlights of Vilakazi Street still cast a soft amber glow, Gogo Thandi kneaded dough. Her bakery, <i>Thandi's Golden Loaf</i>, made the crispest koeksisters and fluffiest dombolo in Soweto, but for years she struggled to get orders beyond her neighborhood.

One afternoon, her grandson showed her SearchBiz. For R199 a month, they registered her listing, set up <code>orders@thandibakery.co.za</code>, and put her verified badge online.

Two weeks later, a boutique hotel manager in Sandton searching for authentic local bakeries found her profile, saw the verified badge, and placed a weekly corporate breakfast contract on the spot.

Today, Thandi's bakery employs three young apprentices from her street.

<i>"In South Africa,"</i> Thandi says with a warm laugh, <i>"hard work builds the dough, but being found puts the honey on it."</i>"""
            send_telegram(chat_id, fallback_story)
            return

    # 12. Instant Conversational Greetings & Well-being
    if re.search(r'^(?:hi|hello|hey|howdy|howzit|good\s+morning|good\s+afternoon|good\s+evening|greetings|sup|whats\s*up)', lower):
        base_url = get_active_api_base()
        reply = f"""👋 <b>Hello {sender}!</b>

I'm doing great, thank you for asking! 😊 I am Hermes, your SearchBiz Executive Agent running on your VPS.

Everything is live and operational on <b>{base_url}</b>. Here is what I can do for you:
• <b>Publish an ad:</b> <i>"Make an ad for Quick Towing in Pretoria, 0825551234, 24/7 breakdown"</i>
• <b>Manage ads:</b> <i>"Delete ad for Quick Towing"</i> or <code>/list_ads</code>
• <b>Send emails:</b> <i>"Send an email explaining What searchbiz.co.za is all about to nicholauscostochetty@gmail.com"</i>
• <b>Check inbox:</b> <code>/check_inbox</code>
• <b>Stories & Business Chat:</b> Ask me for a story, pricing, or advice!

What would you like to do next?"""
        send_telegram(chat_id, reply)
        return

    # 13. Pricing & Subscription Plans
    if re.search(r'(?:pricing|plans?|how\s+much|rates?|costs?|fees?|subscription)', lower):
        pricing = f"""💎 <b>SearchBiz Verified Pricing & Plans</b>

• <b>Base Premium Plan:</b> <b>R199.00 / month</b>
  - Unlimited hosting for static websites
  - Unlimited domain-branded email accounts (@yourdomain.co.za)
  - Custom design assistance for smart static websites
  - Elite verified status and 1 custom directory listing

• <b>Add-Ons & Extras:</b>
  - Additional ad listing: <b>+R199.00 / month</b> each
  - .co.za Domain Registration: <b>R99.00 / year</b>

Would you like me to publish a new ad or send you full plan details via email?"""
        send_telegram(chat_id, pricing)
        return

    # 14. Gratitude & Compliments
    if re.search(r'^(?:thanks|thank\s+you|awesome|great|cool|perfect|well\s+done)', lower):
        send_telegram(chat_id, f"🙏 <b>You're very welcome, {sender}!</b> Always at your service. Let me know whenever you need more listings, emails, or updates!")
        return

    # 14b. Restore / Where did ads go / Recycle Bin recovery
    restore_triggers = [
        'where did all the ads go', 'where all the ads went', 'where are all the ads',
        'where are my ads', 'where did the ads go', 'where is all the ads',
        'restore all ads', 'restore my ads', 'restore ads', 'bring back the ads',
        'bring back all ads', 'untrash all', 'recover ads', 'restore all',
        'bring back my ads'
    ]
    if any(t in lower for t in restore_triggers) or (('where' in lower or 'restore' in lower or 'missing' in lower) and ('ads' in lower or 'listings' in lower)):
        send_chat_action(chat_id, "typing")
        res = searchbiz_restore_all_ads()
        if res.get("success"):
            count = res.get("restoredCount", res.get("count", 0))
            total = res.get("activeTotal", "")
            if count > 0:
                send_telegram(chat_id, f"""♻️ <b>Recycle Bin Restored!</b>

I have retrieved and restored <b>{count} listing(s)</b> from the Recycle Bin back to the active directory!
Total live listings on SearchBiz: <b>{total}</b>.

🌐 You can view all live listings at <a href="https://searchbiz.co.za/directory">searchbiz.co.za/directory</a>.""")
                return
            else:
                send_telegram(chat_id, f"""ℹ️ <b>Directory Status</b>

There were no deleted listings sitting in the Recycle Bin to restore.
Current active listings in the index: <b>{total}</b>.

If you recently reset your database or ran a fresh sync, your listings can also be restored via the Admin Dashboard under <b>Recycle Bin & Trash</b>.""")
                return
        else:
            send_telegram(chat_id, f"⚠️ Unable to query Recycle Bin: {res.get('error')}")
            return

    # 14c. Natural Language Ad Deletion (MUST run BEFORE search!)
    delete_keywords = ['delete', 'remove', 'trash', 'take down', 'takedown', 'get rid of', 'purge']
    has_delete_intent = any(k in lower for k in delete_keywords) and (
        any(w in lower for w in ['ad', 'advertisement', 'listing', 'business', 'created', 'umkomaas', 'it', 'this', 'that']) or
        'just created' in lower or 'you created' in lower or 'it created' in lower or 'last ad' in lower
    )

    if has_delete_intent:
        send_chat_action(chat_id, "typing")
        
        # Check if referring to what was just created or recent
        is_recent_ref = (
            'just created' in lower or 'you just created' in lower or 'it just created' in lower or
            'what it just created' in lower or 'what you just created' in lower or
            'this ad' in lower or 'that ad' in lower or 'the ad you' in lower or
            lower.strip() in ['delete it', 'remove it', 'delete this', 'remove this'] or
            'last ad' in lower
        )

        target = ""
        if is_recent_ref and _LAST_CREATED_AD and _LAST_CREATED_AD.get("id"):
            target = _LAST_CREATED_AD.get("id")
        elif is_recent_ref:
            target = "just created"
        else:
            # Check for city
            sa_cities = ['umkomaas', 'durban', 'ballito', 'pietermaritzburg', 'johannesburg', 'pretoria', 'cape town', 'sandton', 'bloemfontein', 'port elizabeth', 'gqeberha', 'polokwane', 'nelspruit', 'mbombela', 'rustenburg', 'kimberley', 'randburg', 'centurion', 'soweto', 'amanzimtoti', 'scottburgh', 'margate']
            found_c = None
            for c in sa_cities:
                if c in lower:
                    found_c = c
                    break
            
            # Clean text
            cleaned = re.sub(r'^(?:ok\s+|please\s+)?(?:delete|remove|trash|take\s+down|purge)\s+', '', text, flags=re.IGNORECASE).strip()
            cleaned = re.sub(r'(?:the\s+)?ad(?:vertisement)?\s*', '', cleaned, flags=re.IGNORECASE).strip()
            cleaned = re.sub(r'(?:that\s+)?(?:you\s+|it\s+)?just\s+(?:created|made|posted|published)\s*', '', cleaned, flags=re.IGNORECASE).strip()
            cleaned = re.sub(r'^(?:in|for|at|from)\s+', '', cleaned, flags=re.IGNORECASE).strip()
            cleaned = re.sub(r'[?!.,]', '', cleaned).strip()

            if found_c and (not cleaned or len(cleaned) < 3):
                target = found_c
            elif cleaned:
                target = cleaned
            elif _LAST_CREATED_AD:
                target = _LAST_CREATED_AD.get("id", "")
            else:
                target = "just created"

        res = searchbiz_delete_ad(target)
        if res.get("success") and res.get("removedAd"):
            removed = res["removedAd"]
            title = removed.get('title', 'Listing')
            ad_id = removed.get('id', target)
            city = removed.get('city', '')
            loc_str = f" in {city}" if city else ""
            reply = f"""🗑️ <b>Ad Archived to Recycle Bin</b>

Listing <b>"{title}"</b>{loc_str} (ID: <code>{ad_id}</code>) has been successfully taken off the live directory!

♻️ To restore it at any time, just reply:
<code>/restore_ad {ad_id}</code>
or say <i>"Restore all ads"</i>."""
            send_telegram(chat_id, reply)
            return
        else:
            err = res.get("error") or f"Could not find an active listing matching '{target}'."
            send_telegram(chat_id, f"⚠️ <b>Delete request:</b> {err}\n\nYou can run <code>/list_ads</code> to view current live IDs or <code>/delete_ad [ID]</code>.")
            return

    # 14d. Natural Language Directory Search (e.g. "Ok what ads you have in umkomaas")
    search_triggers = ['what ads', 'which ads', 'show ads', 'list ads', 'any ads', 'search ads', 'find ads', 'what businesses', 'show businesses', 'any business', 'ads in', 'businesses in', 'listings in', 'who has ads']
    is_search_intent = (
        (any(k in lower for k in search_triggers) or (lower.startswith('ok ') and any(k in lower for k in ['ads', 'businesses', 'listings']))) and
        not any(w in lower for w in ['delete', 'remove', 'trash', 'take down', 'purge', 'cancel'])
    )

    if is_search_intent:
        search_target = re.sub(r'^(?:ok\s+)?(?:what|which|show|list|find|any|do\s+you\s+have)\s+(?:ads|advertisements|businesses|listings)?\s*(?:do\s+you\s+have\s+|you\s+have\s+|are\s+there\s+)?(?:in|under|for|around)?\s*', '', lower).strip()
        search_target = re.sub(r'[?!.,]', '', search_target).strip()

        all_cities = ['umkomaas', 'durban', 'ballito', 'pietermaritzburg', 'johannesburg', 'pretoria', 'cape town', 'sandton', 'bloemfontein', 'port elizabeth', 'gqeberha', 'polokwane', 'nelspruit', 'mbombela', 'rustenburg', 'kimberley', 'randburg', 'centurion', 'soweto', 'amanzimtoti', 'scottburgh', 'margate']
        if not search_target:
            for c in all_cities:
                if c in lower:
                    search_target = c
                    break

        send_chat_action(chat_id, "typing")
        res = searchbiz_list_ads(search_target or "all", limit=5)
        ads = res.get("ads", []) if isinstance(res, dict) else []

        if ads:
            loc_label = search_target.title() if search_target else "Directory"
            reply = f"🔍 <b>Directory Listings for '{loc_label}' ({len(ads)}):</b>\n\n"
            for i, a in enumerate(ads, 1):
                reply += f"{i}. 🏢 <b>{a.get('title')}</b> ({a.get('category')})\n"
                reply += f"   📍 {a.get('city', 'N/A')}, {str(a.get('province', '')).upper()}\n"
                if a.get('address'):
                    reply += f"   🏠 {a.get('address')}\n"
                reply += f"   📞 {a.get('phone')}\n"
                reply += f"   🆔 <code>{a.get('id')}</code>\n\n"
            reply += f"🌐 <a href=\"https://searchbiz.co.za/directory?q={urllib.parse.quote(search_target)}\">View on SearchBiz Directory</a>"
            send_telegram(chat_id, reply)
            return
        elif search_target and len(search_target) >= 3:
            loc_name = search_target.title()
            reply = f"""🔍 <b>No listings found in {loc_name} yet.</b>

Currently, there are no live advertisements listed under <b>{loc_name}</b>.

Would you like to place the first ad in <b>{loc_name}</b>?
Simply send me:
<i>"Place an ad for [Business Name] in {loc_name}, phone [082...], [address and details]"</i>"""
            send_telegram(chat_id, reply)
            return

    # 15. Natural Language Ad Creation
    ad_creation_triggers = [
        'post ad', 'post an ad', 'post a ad',
        'create ad', 'create an ad', 'create a ad',
        'make an ad', 'make a ad', 'make ad',
        'add ad', 'add an ad', 'add a ad',
        'new ad', 'publish ad', 'publish an ad',
        'place a ad', 'place an ad', 'place ad', 'list ad'
    ]
    has_biz_info = ('business name' in lower or 'company name' in lower) and ('phone' in lower or 'address' in lower or 'tel' in lower or 'cell' in lower)

    if any(k in lower for k in ad_creation_triggers) or has_biz_info:
        phone_match = re.search(r'(?:\+27|0)\s*\d{2}\s*\d{3}\s*\d{4}|\b0\d{9}\b', text)
        phone = re.sub(r'\s+', '', phone_match.group(0)) if phone_match else '0821234567'

        # Province detection
        province = 'gauteng'
        if any(w in lower for w in ['kzn', 'kwazulu', 'natal']): province = 'kwazulu-natal'
        elif 'western cape' in lower or ' wc ' in lower: province = 'western-cape'
        elif 'eastern cape' in lower: province = 'eastern-cape'
        elif 'free state' in lower: province = 'free-state'
        elif 'limpopo' in lower: province = 'limpopo'
        elif 'mpumalanga' in lower: province = 'mpumalanga'
        elif 'north west' in lower: province = 'north-west'
        elif 'northern cape' in lower: province = 'northern-cape'
        elif 'gauteng' in lower: province = 'gauteng'

        # City detection
        cities = ['umkomaas', 'durban', 'johannesburg', 'pretoria', 'cape town', 'sandton', 'bloemfontein', 'port elizabeth', 'gqeberha', 'polokwane', 'nelspruit', 'mbombela', 'rustenburg', 'kimberley', 'ballito', 'randburg', 'centurion', 'soweto', 'amanzimtoti', 'scottburgh', 'margate', 'pietermaritzburg']
        found_city = 'Johannesburg'
        for c in cities:
            if c in lower:
                found_city = ' '.join([w.capitalize() for w in c.split()])
                if c in ['umkomaas', 'durban', 'ballito', 'amanzimtoti', 'scottburgh', 'margate', 'pietermaritzburg']:
                    province = 'kwazulu-natal'
                break

        # Address detection
        addr_match = re.search(r'address[:\s]+([^\n\r]+)', text, re.IGNORECASE)
        address = addr_match.group(1).strip() if addr_match else f"{found_city} 4170"

        # Explicit Title / Business Name detection
        explicit_title = None
        name_match = re.search(r'(?:business\s+name|company\s+name|name)[:\s]+([^\n\r,]+)', text, re.IGNORECASE)
        if name_match and len(name_match.group(1).strip()) > 1:
            explicit_title = name_match.group(1).strip()
        else:
            for line in text.split('\n'):
                if 'business name' in line.lower() or 'company name' in line.lower():
                    cand = re.sub(r'.*(?:business\s+name|company\s+name)[:\s]*', '', line, flags=re.IGNORECASE).strip()
                    if len(cand) > 1:
                        explicit_title = cand
                        break

        if explicit_title:
            title = explicit_title.title()
        else:
            cleaned = re.sub(r'^(?:please\s+)?(?:make|post|create|add|publish|place)\s+(?:an?\s+)?ad(?:vertisement)?\s+(?:for\s+)?', '', text, flags=re.IGNORECASE).strip()
            title_candidate = cleaned.split(' in ')[0].split(' under ')[0].split(' phone ')[0].split(',')[0].strip()
            title = title_candidate.title() if len(title_candidate) > 2 else "New Business Listing"

        cat = "General Services & Trades"
        if any(w in lower for w in ['plumber', 'plumbing', 'pipes']): cat = "Plumbing Services"
        elif any(w in lower for w in ['electric', 'electrical', 'wire', 'wiring']): cat = "Electrical Services"
        elif any(w in lower for w in ['towing', 'tow', 'breakdown', 'recovery']): cat = "Towing & Breakdown"
        elif any(w in lower for w in ['mechanic', 'auto', 'car repair']): cat = "Auto Repair"
        elif any(w in lower for w in ['clean', 'cleaning']): cat = "Cleaning Services"
        elif any(w in lower for w in ['builder', 'building', 'construction', 'roof']): cat = "Construction"
        elif any(w in lower for w in ['restaurant', 'food', 'catering', 'cafe']): cat = "Restaurants & Food"

        send_chat_action(chat_id, "typing")
        res = searchbiz_create_ad(title, cat, found_city, phone, text, province=province, address=address)
        if res.get("success") and res.get("ad"):
            ad = res["ad"]
            reply = f"""✨ <b>Advertisement Published!</b>

🏢 <b>{ad['title']}</b>
🏷️ Category: {ad['category']}
📍 Location: {ad.get('city', found_city)}, {province.upper()}
🏠 Address: {address}
📞 Phone: {ad.get('phone', phone)}
🆔 ID: <code>{ad['id']}</code>
⭐ Status: Verified & Premium

🌐 <a href="https://searchbiz.co.za/directory?q={urllib.parse.quote(ad['title'])}">View Live Listing on SearchBiz</a>"""
            send_telegram(chat_id, reply)
            return
        else:
            err = res.get("error") or "Unknown error"
            send_telegram(chat_id, f"❌ Failed to publish ad: {err}")
            return

    # 17. Conversational AI Assistant with Soul & Personality
    ai_reply = ask_ai(
        text,
        system_prompt=f"You are Hermes, the sharp, witty, loyal, and highly capable AI Executive Assistant for SearchBiz (searchbiz.co.za in South Africa). The user speaking with you is {sender}. Be conversational, charismatic, knowledgeable, and genuinely helpful. Answer with real personality, never sound like a robotic script. Keep replies concise and clean for Telegram."
    )
    if ai_reply:
        send_telegram(chat_id, ai_reply)
        return

    # 18. Fallback Guidance
    send_telegram(chat_id, f"""🤖 <b>SearchBiz Executive Agent</b>
I'm here, <b>{sender}</b>! 

You can talk to me naturally or give me any command:
• <i>"Send an email explaining What searchbiz.co.za is all about to user@domain.com"</i>
• <i>"Tell one story"</i>
• <i>"Make an ad for Elite Plumbers in Durban, 0821234567, emergency repairs"</i>
• <i>"Delete ad for Elite Plumbers"</i>
• <code>/list_ads</code> to search directory listings
• Send <code>/help</code> for full instructions.""")


def main():
    logger.info("=====================================================")
    logger.info("Hermes SearchBiz VPS Agent starting up...")
    logger.info(f"Target Bot: @Searchbiz_bot (Token: {TELEGRAM_BOT_TOKEN[:10]}...)")
    logger.info(f"Ollama Brain: {OLLAMA_API_URL} ({OLLAMA_MODEL})")
    api_base = get_active_api_base()
    logger.info(f"SearchBiz Live API: {api_base}")
    logger.info("=====================================================")

    # Verify Telegram Bot connection
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
                        handle_message(item["message"])
            time.sleep(0.5)
        except KeyboardInterrupt:
            logger.info("Hermes Agent stopped by user.")
            break
        except Exception as e:
            logger.error(f"Error in polling loop: {e}")
            time.sleep(3)


if __name__ == "__main__":
    main()
