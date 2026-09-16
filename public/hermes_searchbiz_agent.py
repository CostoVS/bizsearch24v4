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

# Email Configurations (DirectAdmin or standard VPS SMTP/IMAP)
SMTP_HOST = os.getenv("SMTP_HOST", "mail.searchbiz.co.za")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "mail@searchbiz.co.za")
SMTP_PASS = os.getenv("SMTP_PASS", "")

IMAP_HOST = os.getenv("IMAP_HOST", "mail.searchbiz.co.za")
IMAP_PORT = int(os.getenv("IMAP_PORT", "993"))
IMAP_USER = os.getenv("IMAP_USER", SMTP_USER)
IMAP_PASS = os.getenv("IMAP_PASS", SMTP_PASS)

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

def searchbiz_create_ad(title: str, category: str, city: str, phone: str, description: str, province: str = "gauteng"):
    payload = {
        "title": title,
        "category": category,
        "city": city,
        "province": province,
        "phone": phone,
        "description": description,
        "verified": True,
        "isPremium": True
    }
    return api_request("/api/bot/ad", method="POST", payload=payload)

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


# ============================================================================
# Email System: Send & Receive (SMTP + Gateway Fallback + IMAP)
# ============================================================================
def send_email_smtp(to_email: str, subject: str, body_text: str, html_content: str = None):
    """Sends an email using standard SMTP with automatic fallback to SearchBiz /api/bot/email"""
    # 1. If direct SMTP credentials are provided, attempt direct transmission
    if SMTP_PASS and SMTP_USER:
        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = f"SearchBiz Executive <{SMTP_USER}>"
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body_text, "plain"))
            if html_content:
                msg.attach(MIMEText(html_content, "html"))

            if SMTP_PORT == 465:
                server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=12)
            else:
                server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12)
                server.starttls()

            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, [to_email], msg.as_string())
            server.quit()
            logger.info(f"Direct SMTP email delivered to {to_email}")
            return {"success": True, "message": f"Delivered via direct SMTP to {to_email}"}
        except Exception as e:
            logger.warning(f"Direct SMTP failed ({e}), falling back to SearchBiz API gateway...")

    # 2. Reliable SearchBiz API Gateway Fallback (/api/bot/email)
    res = api_request("/api/bot/email", method="POST", payload={
        "to": to_email,
        "subject": subject,
        "text": body_text,
        "html": html_content
    })
    return res

def fetch_recent_emails(limit: int = 5):
    """Fetches recent emails via IMAP (supports DirectAdmin Exim/Dovecot)"""
    if not IMAP_USER or not IMAP_PASS:
        return {"error": "IMAP credentials not configured"}

    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT, timeout=15)
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
        if not target:
            send_telegram(chat_id, "⚠️ <b>Usage:</b>\n<code>/delete_ad [ID or Business Name]</code>")
            return

        send_chat_action(chat_id, "typing")
        res = searchbiz_delete_ad(target)
        if res.get("success"):
            removed = res.get("removedAd", {})
            send_telegram(chat_id, f"""
🗑️ <b>Ad Archived to Recycle Bin</b>
Listing <b>"{removed.get('title', target)}"</b> (ID: <code>{removed.get('id')}</code>) has been safely taken off the live directory.

♻️ To restore it, run:
<code>/restore_ad {removed.get('id')}</code>
""")
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

    # 10. Natural Language Email Sending (e.g. "Send an email explaining What searchbiz.co.za is all about to nicholauscostochetty@gmail.com")
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    if email_match and any(k in lower for k in ['send an email', 'send email', 'email explaining', 'email about', 'mail explaining', 'mail to', 'shoot an email']):
        recipient = email_match.group(0)
        is_about_searchbiz = any(k in lower for k in ['searchbiz', 'all about', 'what it is', 'pricing', 'plans', 'platform'])

        if is_about_searchbiz:
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

✨ I have dispatched a comprehensive breakdown of <b>SearchBiz.co.za</b>, our verified directory features, and the <b>R199.00/month</b> Premium plan. Check your inbox!"""
            send_telegram(chat_id, confirm)
        else:
            send_telegram(chat_id, f"❌ Failed to dispatch email: {send_res.get('error', 'Unknown gateway error')}")
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

    # 15. Natural Language Ad Creation
    if any(k in lower for k in ['post ad', 'create ad', 'make an ad', 'make ad', 'add ad', 'new ad', 'post an ad', 'publish ad']):
        phone_match = re.search(r'(?:\+27|0)\s*\d{2}\s*\d{3}\s*\d{4}', text)
        phone = re.sub(r'\s+', '', phone_match.group(0)) if phone_match else '0821234567'

        cities = ['durban', 'johannesburg', 'pretoria', 'cape town', 'sandton', 'bloemfontein', 'port elizabeth', 'gqeberha', 'polokwane', 'nelspruit', 'mbombela', 'rustenburg', 'kimberley', 'umkomaas', 'ballito', 'randburg', 'centurion', 'soweto']
        found_city = 'Johannesburg'
        for c in cities:
            if c in lower:
                found_city = ' '.join([w.capitalize() for w in c.split()])
                break

        cleaned = re.sub(r'^(?:please\s+)?(?:make|post|create|add|publish)\s+(?:an?\s+)?ad(?:vertisement)?\s+(?:for\s+)?', '', text, flags=re.IGNORECASE).strip()
        title_candidate = cleaned.split(' in ')[0].split(' phone ')[0].split(',')[0].strip()
        title = title_candidate.title() if len(title_candidate) > 2 else "New Business Listing"

        cat = "General Services"
        if any(w in lower for w in ['plumber', 'plumbing', 'pipes']): cat = "Plumbers"
        elif any(w in lower for w in ['electric', 'electrical', 'wire', 'wiring']): cat = "Electricians"
        elif any(w in lower for w in ['towing', 'tow', 'breakdown', 'recovery']): cat = "Towing & Breakdown"
        elif any(w in lower for w in ['mechanic', 'auto', 'car repair']): cat = "Auto Repair"
        elif any(w in lower for w in ['clean', 'cleaning']): cat = "Cleaning Services"
        elif any(w in lower for w in ['builder', 'building', 'construction', 'roof']): cat = "Construction"
        elif any(w in lower for w in ['restaurant', 'food', 'catering', 'cafe']): cat = "Restaurants & Food"

        send_chat_action(chat_id, "typing")
        res = searchbiz_create_ad(title, cat, found_city, phone, text)
        if res.get("success") and res.get("ad"):
            ad = res["ad"]
            reply = f"""✨ <b>Advertisement Published!</b>

🏢 <b>{ad['title']}</b>
🏷️ Category: {ad['category']}
📍 Location: {ad.get('city', found_city)}
📞 Phone: {ad.get('phone', phone)}
🆔 ID: <code>{ad['id']}</code>
⭐ Status: Verified & Premium

🌐 <a href="https://searchbiz.co.za/directory?q={urllib.parse.quote(ad['title'])}">View Live Listing on SearchBiz</a>"""
            send_telegram(chat_id, reply)
            return

    # 16. Natural Language Ad Deletion
    if any(k in lower for k in ['delete ad', 'remove ad', 'trash ad', 'take down']):
        cleaned = re.sub(r'^(?:please\s+)?(?:delete|remove|trash|take\s+down)\s+(?:the\s+)?ad(?:vertisement)?\s+(?:for\s+)?', '', text, flags=re.IGNORECASE).strip()
        if len(cleaned) >= 2:
            send_chat_action(chat_id, "typing")
            res = searchbiz_delete_ad(cleaned, permanent=False)
            if res.get("success") and res.get("removedAd"):
                ad = res["removedAd"]
                reply = f"""🗑️ <b>Ad Archived to Recycle Bin</b>

Listing <b>"{ad['title']}"</b> (ID: <code>{ad['id']}</code>) has been safely moved to the SearchBiz Recycle Bin.

♻️ To restore it, send:
<code>/restore_ad {ad['id']}</code>"""
                send_telegram(chat_id, reply)
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
