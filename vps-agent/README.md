# SearchBiz Hermes Autonomous Agent, VPS Monitoring & Security Suite

This package connects **Hermes Executive Agent**, **Ollama (`Llama-3.2-3B-Instruct-Abliterated GGUF`)**, and **Telegram (`@Searchbiz_bot`)** directly to **searchbiz.co.za** to autonomously manage directory listings, scrape & enrich CSV business leads, generate watermark-free FLUX images, generate Word/PDF documents, and monitor/protect your VPS with open-source tools.

---

## 1. Quick VPS Installation & Update

### To Update an Existing VPS Agent (Run from terminal):
```bash
cd /opt/hermes-searchbiz || cd ~/bizsearch24v4/vps-agent
git pull || true
sudo ./update_agent.sh
```

### To Enable Open-Source Security & Firewall Protection (UFW, Fail2ban, ClamAV):
```bash
sudo ./setup_security.sh
```

### To Monitor VPS & Open Ports from Terminal:
```bash
./monitor_vps.sh            # Full live dashboard (CPU, RAM, Disk, Ports, Visitors)
./monitor_vps.sh --ports    # Active listening ports and sockets
./monitor_vps.sh --visitors # Today's website visitor traffic & top paths
./monitor_vps.sh --security # Firewall status, fail2ban jails, and blocked probes
```

---

## 2. Complete Telegram Commands Reference (`@Searchbiz_bot`)

### 🎨 Image Generation (Open-Source FLUX.1 Engine):
* `/image [description]` — Generates a watermark-free FLUX image.
* Natural queries: *"Generate a land image"*, *"Draw a picture of Durban beach at sunrise"*, *"Create a photo of modern office"*.
* Refinements: *"Remove the watermark and girl"*, *"Make the ocean calmer"*.

### 🖥️ Open-Source VPS & Port Monitoring:
* `/monitor` or `/vps` — Real-time CPU, RAM, Disk, Uptime, Open Ports, and Visitors.
* `/ports` — Audit all listening TCP/UDP ports and bound services.
* `/visitors` — Analyzes Nginx logs for today's visits, unique visitor IPs, and visited pages.

### 🛡️ Security, Antivirus & Attack Prevention:
* `/security` — Comprehensive security overview (UFW firewall, Fail2ban active jails, ClamAV, blocked attackers).
* `/scan_vps [path]` — Deep virus, webshell, and malware scan (e.g. `/scan_vps /var/www`).
* `/block_ip [IP]` — Instantly bans a malicious IP address across UFW and iptables.
* `/unblock_ip [IP]` — Removes an IP firewall ban.

### 📊 Google Maps CSV Leads & Enrichment:
* Send any `.CSV` file to Telegram — Hermes parses and stores businesses in SQLite.
* `/enrich [ID]` — Scrapes each business's website to discover email addresses and WhatsApp numbers.
* `/export_leads [ID]` — Exports clean/enriched CSV for download.
* `/import_searchbiz [ID]` — Bulk imports all businesses into SearchBiz directory.
* `/leads` — Shows recent stored lead datasets.

### 💬 Direct Outreach (WhatsApp, Email, Telegram):
* `/whatsapp [ID or Name]` — Generates click-to-chat WhatsApp sales link with personalized pitch.
* `/email_lead [ID or Name]` — Sends automated listing invitation via Mailcow SMTP.
* `/telegram_lead [ID or Name]` — Creates direct Telegram contact link.

### 🎙️ Free Open-Source Voice Reader (Voice Notes & Speech Understanding):
* **No Gemini Needed**: Understands Telegram voice notes natively using open-source **faster-whisper** and **Vosk** directly on your VPS CPU!
* **Send Voice Notes**: Hold the mic in Telegram and speak naturally. Hermes will transcribe what you said and immediately reply with both text and voice.
* `/test_voice` — Diagnoses your VPS speech recognition setup (FFmpeg, Whisper, Vosk, TTS).
* `/fix_voice` — 1-click automatic installation of FFmpeg, Whisper, and speech models directly from Telegram.
* `/voice_mode on|off` — Toggle automatic voice note audio replies for every message (Dual Voice Mode - ON by default).
* `/voice_style sonia|libby|maisie|za` — Choose your preferred British voice tone.
* `/voice [text]` or `/speak [text]` — Make Hermes speak any custom text out loud.

### 📄 Document Creation:
* `/docx [Title] [Topic]` — Generates a Microsoft Word document (.docx).
* `/pdf [Title] [Topic]` — Generates an executive PDF report (.pdf).

### ⏰ Schedules & Daily Automation:
* `/schedule_weather 07:00 Durban` — Automated daily morning forecast.
* `/schedules` — Shows all active daily jobs.
* `/cancel_weather` — Stops daily briefings.

### 🧠 Permanent Memory:
* `/remember [fact]` — Stores permanent facts across all server restarts.
* `/memory` — Displays everything Hermes remembers about you.
* `/clear_memory` — Clears stored facts.

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
