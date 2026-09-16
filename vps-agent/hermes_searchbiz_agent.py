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
# Ollama Brain (qwen2.5:3b)
# ============================================================================
def ask_ollama(prompt: str, system_prompt: str = None) -> str:
    """Invokes local Ollama qwen2.5:3b model"""
    url = f"{OLLAMA_API_URL}/api/generate"
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_predict": 350
        }
    }
    if system_prompt:
        payload["system"] = system_prompt

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=40) as res:
            ans = json.loads(res.read().decode("utf-8"))
            return ans.get("response", "").strip()
    except Exception as e:
        logger.error(f"Ollama call failed: {e}")
        return ""


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

    # 10. Natural Language Router via Ollama (qwen2.5:3b)
    send_telegram(chat_id, "🤖 <i>Processing with Ollama qwen2.5:3b...</i>")

    system_prompt = """You are Hermes, an autonomous AI executive on a Linux VPS managing searchbiz.co.za.
Determine the user's intent. Output ONLY a valid JSON object matching one of these schemas:
1. For creating an ad:
{"intent": "create_ad", "title": "...", "category": "...", "city": "...", "phone": "...", "description": "..."}
2. For deleting an ad:
{"intent": "delete_ad", "target": "..."}
3. For sending email:
{"intent": "send_email", "to": "...", "subject": "...", "body": "..."}
4. For general answer or chat:
{"intent": "chat", "reply": "..."}
DO NOT output markdown code fences, ONLY the raw JSON string."""

    ollama_resp = ask_ollama(text, system_prompt=system_prompt)
    logger.info(f"Ollama raw response: {ollama_resp}")

    try:
        # Clean response if wrapped in code block
        clean_json = ollama_resp.strip()
        if clean_json.startswith("```"):
            clean_json = clean_json.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        data = json.loads(clean_json)
        intent = data.get("intent")

        if intent == "create_ad":
            res = searchbiz_create_ad(
                title=data.get("title", "Business Listing"),
                category=data.get("category", "General Services"),
                city=data.get("city", "Johannesburg"),
                phone=data.get("phone", "0821234567"),
                description=data.get("description", text)
            )
            if res.get("success"):
                send_telegram(chat_id, f"✨ <b>Ad Created via AI!</b>\n🏢 <b>{res['ad']['title']}</b>\n📍 {res['ad']['city']} | 📞 {res['ad']['phone']}\n🔗 <a href='{SEARCHBIZ_API_URL}/directory?q={urllib.parse.quote(res['ad']['title'])}'>View on SearchBiz</a>")
            else:
                send_telegram(chat_id, f"❌ Failed to create ad: {res.get('error')}")

        elif intent == "delete_ad":
            target = data.get("target", text)
            res = searchbiz_delete_ad(target)
            if res.get("success"):
                send_telegram(chat_id, f"🗑️ <b>Ad Archived:</b> Removed '{res['removedAd']['title']}' to Recycle Bin.")
            else:
                send_telegram(chat_id, f"❌ Could not delete: {res.get('error')}")

        elif intent == "send_email":
            res = send_email_smtp(data.get("to"), data.get("subject", "Notice"), data.get("body", "Hello"))
            if res.get("success"):
                send_telegram(chat_id, f"📧 Email sent to <code>{data.get('to')}</code>")
            else:
                send_telegram(chat_id, f"❌ Email error: {res.get('error')}")

        else:
            send_telegram(chat_id, data.get("reply", "Understood. How else can I assist with SearchBiz?"))

    except Exception as e:
        logger.warn(f"Failed to parse Ollama JSON ({e}), outputting text reply.")
        send_telegram(chat_id, ollama_resp or "Command received. Send /help to see all operations.")


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
