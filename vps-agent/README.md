# SearchBiz Hermes Autonomous Agent & VPS Email Setup Guide

This package connects **Hermes Agent**, **Ollama (`qwen2.5:3b`)**, and **Telegram (`@Searchbiz_bot`)** directly to **searchbiz.co.za** to autonomously create ads, delete ads, and manage emails.

---

## 1. Quick VPS Installation & Update

### To Update an Existing VPS Agent (1 Command):
```bash
cd /opt/hermes-searchbiz || cd ~/vps-agent
git pull || true
sudo ./update_agent.sh
```
Or simply copy the updated `hermes_searchbiz_agent.py` to `/opt/hermes-searchbiz/` and run:
```bash
sudo systemctl restart hermes-agent
```

### Fresh Installation:
```bash
cd vps-agent
chmod +x install_vps.sh
sudo ./install_vps.sh
```

---

## 2. Live Internet & Conversational Capabilities

Hermes is now connected to the live internet, answering questions with real-time data:

| Feature | Commands | Natural Language Examples |
| :--- | :--- | :--- |
| **Identity & Personality** | `/start`, `/help` | *"What is your name?"*, *"Who are you?"*, *"Tell me about yourself"* |
| **Live Weather** | `/weather [city]` | *"What's the weather in Durban?"*, *"Temperature in Johannesburg"*, *"Is it raining in Cape Town?"* |
| **Live Crypto / Bitcoin** | `/crypto [symbol]`, `/btc` | *"What's the current price of BTC?"*, *"Bitcoin price"*, *"Ethereum price in ZAR"* |
| **Live Date & Time** | `/date`, `/time` | *"What is the day today?"*, *"What's today's date?"*, *"What time is it in South Africa?"* |
| **Live Google / Web Search** | `/search [query]`, `/google [query]` | *"Search this on Google: best tourist spots in South Africa"*, *"Where can I find solar panels in Durban?"*, *"What is quantum computing?"* |

---

## 3. Telegram Directory & Email Commands (`@Searchbiz_bot`)

You can control everything directly from your phone in Telegram:

| Command | Example | What It Does |
| :--- | :--- | :--- |
| **`/post_ad`** | `/post_ad Durban Auto Glass \| Auto Repair \| Durban \| 0821234567 \| 24/7 Windscreen replacements` | Instantly publishes the ad on SearchBiz with Verified & Premium status. |
| **`/delete_ad`** | `/delete_ad Durban Auto Glass` or `/delete_ad ad-agent-12345` | Safely takes down the ad and moves it to the **SearchBiz Recycle Bin**. |
| **`/recycle_bin`** | `/recycle_bin` | Shows recently deleted ads. |
| **`/restore_ad`** | `/restore_ad ad-agent-12345` | Restores an ad from the Recycle Bin back to live status. |
| **`/list_ads`** | `/list_ads Durban` | Searches and lists live ads with their IDs. |
| **`/send_email`** | `/send_email client@domain.com \| Quote \| Here is your invoice` | Sends an email via SMTP. |
| **`/check_inbox`**| `/check_inbox` | Checks incoming emails via IMAP. |
| **`/create_email`**| `/create_email info StrongPassword searchbiz.co.za` | DirectAdmin API: provisions new email mailbox on your VPS. |
| **`/status`** | `/status` | Tests connections to SearchBiz, Ollama, SMTP, and IMAP. |

### Natural Language AI Commands
You can also chat normally without slashes:
- *"Make an ad for Quick Towing in Pretoria, phone 0825551234, 24/7 breakdown recovery"*
- *"Remove the ad for Quick Towing"*
- *"Send an email to john@example.com telling him his listing is approved"*

---

## 3. Email System Options on Your VPS

You asked about setting up an email system so the AI can **send and receive emails** and create mailboxes (like DirectAdmin). Here are the 2 best options:

### Option A: DirectAdmin Email Hosting (Recommended if DirectAdmin is already on your VPS)
DirectAdmin comes with:
- **Exim**: High-performance Mail Transfer Agent for sending (SMTP ports 465/587).
- **Dovecot**: IMAP/POP3 server for receiving and reading emails (IMAP port 993).
- **Roundcube Webmail**: Web interface to access emails at `https://your-vps:2222/roundcube`.
- **API Automation**: Hermes uses DirectAdmin's `CMD_API_POP` to create new `@searchbiz.co.za` email accounts on the fly when you ask!

**DNS Requirements for DirectAdmin Mail:**
Set these DNS records on your domain registrar (e.g., for `searchbiz.co.za`):
1. **MX Record:** `searchbiz.co.za` -> Priority 10 -> `mail.searchbiz.co.za`
2. **A Record:** `mail.searchbiz.co.za` -> Your VPS IP address
3. **SPF Record (TXT):** `"v=spf1 mx a ~all"`
4. **DKIM:** Generated in DirectAdmin -> E-Mail Accounts -> DKIM.

### Option B: Free Lightweight Open-Source Mail Server: Stalwart Mail
If you do NOT have DirectAdmin and want a 100% free open-source mail server on your VPS:
- **Stalwart Mail Server** is written in Rust.
- It uses only **~50MB of RAM** (crucial because Ollama already uses 2.2GB).
- Single binary that supports SMTP, IMAP, and JMAP with built-in DKIM, DMARC, and SPF.
- Install with 1 command:
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://get.stalwart.io | sh
  ```

---

## 4. SearchBiz Webhook Alternative (Direct Webhook)

If you prefer SearchBiz to receive Telegram messages directly through the Next.js website without needing the VPS Python script running:
- Open: `https://searchbiz.co.za/api/telegram/webhook?set=1`
- Telegram will immediately start streaming updates to `/api/telegram/webhook`!
