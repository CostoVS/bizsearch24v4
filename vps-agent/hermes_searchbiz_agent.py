#!/usr/bin/env python3
"""
=============================================================================
SearchBiz Hermes Autonomous Agent (VPS Daemon)
Interface: Telegram (@Searchbiz_bot)
Local Brain: Ollama (qwen2.5:3b)
Target Platform: searchbiz.co.za
Capabilities:
  1. Create business advertisements on searchbiz.co.za
  2. Remove / delete advertisements (with safe Recycle Bin archiving)
  3. Search and audit live advertisements
  4. Send emails via SMTP
  5. Check & read incoming emails via IMAP
  6. Create domain-branded mailboxes via DirectAdmin API
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
SEARCHBIZ_API_URL = os.getenv("SEARCHBIZ_API_URL", "https://searchbiz.co.za").rstrip("/")
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


# ============================================================================
# Telegram HTTP Utilities (Native urllib, Zero extra pip dependencies needed)
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
    """Shows native 'typing...' indicator in Telegram"""
    return telegram_call("sendChatAction", {
        "chat_id": chat_id,
        "action": action
    })


# ============================================================================
# SearchBiz Website API Client
# ============================================================================
def api_request(endpoint: str, method: str = "GET", payload: dict = None):
    url = f"{SEARCHBIZ_API_URL}{endpoint}"
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
# Email System: Send & Receive (SMTP + IMAP)
# ============================================================================
def send_email_smtp(to_email: str, subject: str, body_text: str):
    """Sends an email using standard SMTP (supports DirectAdmin Exim or any host)"""
    if not SMTP_USER or not SMTP_PASS:
        # Fall back to SearchBiz API email proxy
        res = api_request("/api/bot/email", method="POST", payload={
            "to": to_email,
            "subject": subject,
            "body": body_text
        })
        return res

    try:
        msg = MIMEMultipart()
        msg["From"] = SMTP_USER
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body_text, "plain"))

        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)
            server.starttls()

        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
        server.quit()
        return {"success": True, "message": f"Dispatched email to {to_email}"}
    except Exception as e:
        logger.error(f"SMTP send failed: {e}")
        return {"error": str(e)}

def fetch_recent_emails(limit: int = 5):
    """Checks the IMAP mailbox for recent unread or latest emails"""
    if not IMAP_USER or not IMAP_PASS:
        return {"error": "IMAP credentials not configured in environment (.env.vps)"}

    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
        mail.login(IMAP_USER, IMAP_PASS)
        mail.select("INBOX")

        status, messages = mail.search(None, "ALL")
        if status != "OK" or not messages[0]:
            mail.logout()
            return {"count": 0, "emails": []}

        msg_ids = messages[0].split()
        latest_ids = msg_ids[-limit:]
        latest_ids.reverse()

        result_emails = []
        for mid in latest_ids:
            res, data = mail.fetch(mid, "(RFC822)")
            if res == "OK":
                raw = email.message_from_bytes(data[0][1])
                subj = raw.get("Subject", "No Subject")
                # decode subject if needed
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
    """Creates a new email address inside DirectAdmin (e.g. support@searchbiz.co.za)"""
    if not DIRECTADMIN_USER or not DIRECTADMIN_PASS:
        return {"error": "DIRECTADMIN_USER or DIRECTADMIN_PASS not configured"}

    url = f"{DIRECTADMIN_URL}/CMD_API_POP"
    data = urllib.parse.urlencode({
        "action": "create",
        "domain": domain,
        "user": username,
        "passwd": password,
        "passwd2": password,
        "quota": quota_mb  # 0 = unlimited
    }).encode("utf-8")

    # Basic Auth for DirectAdmin
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
                return {"success": True, "email": f"{username}@{domain}", "response": resp_text}
            return {"error": resp_text}
    except Exception as e:
        return {"error": str(e)}


# ============================================================================
# Multi-Tier AI Brain (Local Ollama qwen2.5:3b + SearchBiz Cloud AI API)
# ============================================================================
def ask_ai(prompt: str, system_prompt: str = None) -> str:
    """Invokes AI Brain with automatic multi-tier fallback:
    1. Local Ollama qwen2.5:3b (fast 12s timeout)
    2. SearchBiz Cloud AI Endpoint (/api/llama3/chat or /api/gemini/chat)
    """
    # 1. Try local Ollama
    try:
        url = f"{OLLAMA_API_URL}/api/generate"
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.4,
                "num_predict": 280
            }
        }
        if system_prompt:
            payload["system"] = system_prompt

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=12) as res:
            ans = json.loads(res.read().decode("utf-8"))
            resp = ans.get("response", "").strip()
            if resp:
                return resp
    except Exception as e:
        logger.warning(f"Local Ollama inference failed/slow ({e}). Falling back to SearchBiz Cloud AI...")

    # 2. Try SearchBiz Server AI
    for ep in ["/api/llama3/chat", "/api/gemini/chat"]:
        try:
            cloud_url = f"{SEARCHBIZ_API_URL}{ep}"
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
                if cloud_text:
                    return cloud_text.strip()
        except Exception as e2:
            logger.warning(f"SearchBiz cloud AI endpoint '{ep}' error: {e2}")

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

    logger.info(f"Incoming command from {sender} ({chat_id}): '{text}'")

    # 1. Start & Help
    if text.startswith("/start") or text.startswith("/help"):
        reply = f"""
🌟 <b>SearchBiz Hermes Executive Agent</b>
Ready on your VPS, <b>{sender}</b>!

Connected Brain: <code>{OLLAMA_MODEL}</code> via Ollama
Target Platform: <code>{SEARCHBIZ_API_URL}</code>

<b>Core Commands:</b>
➕ <code>/post_ad Title | Category | City | Phone | Description</code>
🗑️ <code>/delete_ad [Business Name or ID]</code>
🔍 <code>/list_ads [keyword]</code>
♻️ <code>/restore_ad [ID]</code>
📧 <code>/send_email to@domain.com | Subject | Body</code>
📥 <code>/check_inbox</code>
📬 <code>/create_email username password [domain]</code>
⚡ <code>/status</code>

<b>Or tell me what to do in plain English:</b>
<i>"Make an ad for Quick Towing in Pretoria, phone 0825551234, 24/7 breakdown recovery"</i>
<i>"Remove the ad for Quick Towing"</i>
"""
        send_telegram(chat_id, reply)
        return

    # 2. Status check
    if text == "/status":
        ads_check = searchbiz_list_ads("", limit=1)
        ads_online = "error" not in ads_check
        ollama_test = ask_ollama("Say 'OK'")
        ollama_online = bool(ollama_test)

        status_msg = f"""
⚡ <b>System Diagnostic:</b>
• <b>SearchBiz Website API:</b> {'🟢 ONLINE' if ads_online else '🔴 OFFLINE'}
• <b>Ollama ({OLLAMA_MODEL}):</b> {'🟢 ACTIVE' if ollama_online else '🔴 UNREACHABLE'}
• <b>SMTP Outbound:</b> <code>{SMTP_HOST}:{SMTP_PORT}</code>
• <b>IMAP Inbound:</b> <code>{IMAP_HOST}:{IMAP_PORT}</code>
• <b>DirectAdmin API:</b> <code>{DIRECTADMIN_URL}</code>
"""
        send_telegram(chat_id, status_msg)
        return

    # 3. Post Ad Command
    if text.startswith("/post_ad") or text.startswith("/create_ad"):
        raw = text.split(" ", 1)[-1].strip() if " " in text else ""
        parts = [p.strip() for p in raw.split("|")]
        if len(parts) < 4:
            send_telegram(chat_id, "⚠️ <b>Usage:</b>\n<code>/post_ad Title | Category | City | Phone | Description</code>")
            return

        title, category, city, phone = parts[0], parts[1], parts[2], parts[3]
        description = parts[4] if len(parts) > 4 else f"Verified {category} in {city}."

        send_telegram(chat_id, f"⏳ Publishing ad <b>'{title}'</b> on searchbiz.co.za...")
        res = searchbiz_create_ad(title, category, city, phone, description)
        if res.get("success"):
            ad = res["ad"]
            send_telegram(chat_id, f"""
✅ <b>Advertisement Live!</b>
🏢 <b>{ad.get('title')}</b>
🏷️ {ad.get('category')} | 📍 {ad.get('city')}
📞 {ad.get('phone')}
🆔 <code>{ad.get('id')}</code>
🌐 <a href="{SEARCHBIZ_API_URL}/directory?q={urllib.parse.quote(title)}">View on SearchBiz Directory</a>
""")
        else:
            send_telegram(chat_id, f"❌ Failed: {res.get('error')}")
        return

    # 4. Delete Ad Command
    if text.startswith("/delete_ad") or text.startswith("/remove_ad"):
        target = text.split(" ", 1)[-1].strip() if " " in text else ""
        if not target:
            send_telegram(chat_id, "⚠️ <b>Usage:</b>\n<code>/delete_ad [ID or Business Name]</code>")
            return

        send_telegram(chat_id, f"⏳ Searching & archiving ad '{target}'...")
        res = searchbiz_delete_ad(target)
        if res.get("success"):
            removed = res.get("removedAd", {})
            send_telegram(chat_id, f"""
🗑️ <b>Ad Archived to Recycle Bin</b>
Listing <b>"{removed.get('title', target)}"</b> (ID: <code>{removed.get('id')}</code>) has been safely taken off the live directory.

♻️ It is stored in the Recycle Bin. To restore it, run:
<code>/restore_ad {removed.get('id')}</code>
""")
        else:
            send_telegram(chat_id, f"❌ Failed: {res.get('error')}")
        return

    # 5. List Ads
    if text.startswith("/list_ads"):
        query = text.split(" ", 1)[-1].strip() if " " in text else ""
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

    # 6. Restore Ad
    if text.startswith("/restore_ad"):
        target = text.split(" ", 1)[-1].strip() if " " in text else ""
        res = searchbiz_restore_ad(target)
        if res.get("success"):
            send_telegram(chat_id, f"✅ <b>Restored!</b> Listing <b>\"{res['ad']['title']}\"</b> is live again.")
        else:
            send_telegram(chat_id, f"❌ Restore error: {res.get('error')}")
        return

    # 7. Send Email
    if text.startswith("/send_email"):
        raw = text.split(" ", 1)[-1].strip() if " " in text else ""
        parts = [p.strip() for p in raw.split("|")]
        if len(parts) < 3:
            send_telegram(chat_id, "⚠️ <b>Usage:</b>\n<code>/send_email recipient@domain.com | Subject | Body text</code>")
            return

        to_email, subject, body = parts[0], parts[1], parts[2]
        send_telegram(chat_id, f"⏳ Sending email to <code>{to_email}</code>...")
        res = send_email_smtp(to_email, subject, body)
        if res.get("success"):
            send_telegram(chat_id, f"📧 <b>Email Sent!</b> To: <code>{to_email}</code>\nSubject: <i>{subject}</i>")
        else:
            send_telegram(chat_id, f"❌ Email send failed: {res.get('error')}")
        return

    # 8. Check Inbox
    if text == "/check_inbox":
        send_telegram(chat_id, "📬 Checking IMAP inbox...")
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

    # 9. Create DirectAdmin Email Account
    if text.startswith("/create_email"):
        parts = text.split()
        if len(parts) < 3:
            send_telegram(chat_id, "⚠️ <b>Usage:</b>\n<code>/create_email username password [domain]</code>\n<i>Example:</i> <code>/create_email info Pass123! searchbiz.co.za</code>")
            return

        user = parts[1]
        pwd = parts[2]
        domain = parts[3] if len(parts) > 3 else "searchbiz.co.za"

        send_telegram(chat_id, f"⏳ Provisioning mailbox <code>{user}@{domain}</code> in DirectAdmin...")
        res = directadmin_create_mailbox(user, pwd, domain)
        if res.get("success"):
            send_telegram(chat_id, f"✅ <b>Mailbox Created!</b>\nAddress: <code>{user}@{domain}</code>\nPassword: <code>{pwd}</code>")
        else:
            send_telegram(chat_id, f"❌ DirectAdmin error: {res.get('error')}")
        return

    # Send typing action to Telegram
    send_chat_action(chat_id, "typing")
    lower = text.lower()

    # 10. Instant Conversational Greetings & Well-being
    if re.search(r'^(?:hi|hello|hey|howdy|howzit|good\s+morning|good\s+afternoon|good\s+evening|greetings|sup|whats\s*up)', lower):
        reply = f"""👋 <b>Hello {sender}!</b>

I'm doing great, thank you for asking! 😊 I am Hermes, your SearchBiz Executive Agent running on your VPS.

Everything is live and operational on <b>{SEARCHBIZ_API_URL}</b>. Here is what I can do for you:
• <b>Publish an ad:</b> <i>"Make an ad for Quick Towing in Pretoria, 0825551234, 24/7 breakdown"</i>
• <b>Manage ads:</b> <i>"Delete ad for Quick Towing"</i> or <code>/list_ads</code>
• <b>Send emails:</b> <code>/send_email client@domain.com | Subject | Body</code>
• <b>Check inbox:</b> <code>/check_inbox</code>
• <b>Business questions:</b> Ask me about pricing, services, or business marketing!

What would you like to work on today?"""
        send_telegram(chat_id, reply)
        return

    # 11. Pricing & Subscription Plans
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

Would you like me to publish a new ad or create an email account for you?"""
        send_telegram(chat_id, pricing)
        return

    # 12. Gratitude & Confirmation
    if re.search(r'^(?:thanks|thank\s+you|awesome|great|cool|perfect|well\s+done)', lower):
        send_telegram(chat_id, f"🙏 <b>You're very welcome, {sender}!</b> Always at your service. Let me know whenever you need more listings or updates!")
        return

    # 13. Natural Language Ad Creation
    if any(k in lower for k in ['post ad', 'create ad', 'make an ad', 'make ad', 'add ad', 'new ad', 'post an ad', 'publish ad']):
        # extract phone
        phone_match = re.search(r'(?:\+27|0)\s*\d{2}\s*\d{3}\s*\d{4}', text)
        phone = re.sub(r'\s+', '', phone_match.group(0)) if phone_match else '0821234567'

        # extract city
        cities = ['durban', 'johannesburg', 'pretoria', 'cape town', 'sandton', 'bloemfontein', 'port elizabeth', 'gqeberha', 'polokwane', 'nelspruit', 'mbombela', 'rustenburg', 'kimberley', 'umkomaas', 'ballito', 'randburg', 'centurion', 'soweto']
        found_city = 'Johannesburg'
        for c in cities:
            if c in lower:
                found_city = ' '.join([w.capitalize() for w in c.split()])
                break

        # extract title
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

🌐 <a href="{SEARCHBIZ_API_URL}/directory?q={urllib.parse.quote(ad['title'])}">View Live Listing on SearchBiz</a>"""
            send_telegram(chat_id, reply)
            return

    # 14. Natural Language Ad Deletion
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

    # 15. General Conversational AI Assistant
    send_chat_action(chat_id, "typing")
    ai_reply = ask_ai(
        text,
        system_prompt=f"You are Hermes, the friendly, intelligent AI Executive Assistant for SearchBiz (searchbiz.co.za in South Africa). The user is {sender}. Be helpful, polite, and concise. Explain South African business directory details, ad management, and assistance clearly in under 150 words."
    )
    if ai_reply:
        send_telegram(chat_id, ai_reply)
        return

    # 16. Fallback Guidance
    send_telegram(chat_id, f"""🤖 <b>SearchBiz Executive Agent</b>
Ready to help, <b>{sender}</b>!

You can talk to me naturally or give me commands:
• <i>"Make an ad for Elite Plumbers in Durban, 0821234567, emergency leak repairs"</i>
• <i>"Delete ad for Elite Plumbers"</i>
• <i>"What are the pricing plans?"</i>
• <code>/list_ads</code> to search listings
• <code>/send_email to@domain.com | Subject | Body</code>
• Send <code>/help</code> for full instructions.""")


def main():
    logger.info("=====================================================")
    logger.info("Hermes SearchBiz VPS Agent starting up...")
    logger.info(f"Target Bot: @Searchbiz_bot (Token: {TELEGRAM_BOT_TOKEN[:10]}...)")
    logger.info(f"Ollama Brain: {OLLAMA_API_URL} ({OLLAMA_MODEL})")
    logger.info(f"SearchBiz API: {SEARCHBIZ_API_URL}")
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
