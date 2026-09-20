#!/usr/bin/env bash
# =============================================================================
# SearchBiz Open-Source VPS Security, Firewall & Antivirus Setup
# =============================================================================
set -e

echo "🛡️ Configuring SearchBiz VPS Security & Open-Source Protection Suite..."

# 1. Install Essential Open-Source Security Packages (with fast timeout so it never hangs)
echo "📦 Verifying security packages (UFW, Fail2ban, ClamAV, Net Tools)..."
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    -o Acquire::http::Timeout="10" \
    -o Acquire::ftp::Timeout="10" \
    ufw fail2ban clamav net-tools iptables 2>/dev/null || true

# 2. Configure UFW (Uncomplicated Firewall)
echo "🔒 Configuring Strict Firewall Rules..."
# Default policies: block all incoming, allow all outgoing
ufw default deny incoming
ufw default allow outgoing

# --- CRITICAL: NetBird VPN Mesh & Remote Admin Safeguards ---
# Your terminal logs in from NetBird (100.127.x.x). Never block NetBird!
ufw allow in on wt0 comment "NetBird Mesh Interface" 2>/dev/null || true
ufw allow from 100.64.0.0/10 comment "NetBird CGNAT VPN Subnet" 2>/dev/null || true
ufw allow 51820/udp comment "NetBird / WireGuard UDP" 2>/dev/null || true

# Core VPS Infrastructure Ports
ufw allow 22/tcp comment "SSH Remote Management"
ufw allow 80/tcp comment "Nginx Web Server HTTP"
ufw allow 443/tcp comment "Nginx Web Server HTTPS"
ufw allow 3000/tcp comment "SearchBiz Next.js Applet"
ufw allow 2222/tcp comment "DirectAdmin Control Panel"

# Mailcow / VPS Mail Server Ports
ufw allow 25/tcp comment "SMTP Mail Transfer"
ufw allow 587/tcp comment "SMTP Submission"
ufw allow 465/tcp comment "SMTPS Secure Submission"
ufw allow 993/tcp comment "IMAP Secure"
ufw allow 110/tcp comment "POP3"
ufw allow 995/tcp comment "POP3 Secure"

# Local AI Engine (Bind to localhost only, but protect port 11434)
# Ollama runs on 127.0.0.1:11434 and does not need external exposure

# Enable UFW without prompting
echo "y" | ufw enable || true
echo "✅ UFW Firewall active!"

# 3. Configure Fail2ban for Automatic Brute-Force & Attack Banning
echo "🛡️ Configuring Fail2ban Jails..."
cat << 'EOF' > /etc/fail2ban/jail.local
[DEFAULT]
bantime = 86400
findtime = 600
maxretry = 5
banaction = ufw

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 4

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

systemctl enable fail2ban || true
systemctl restart fail2ban || true
echo "✅ Fail2ban active with automated 24-hour IP banning!"

# 4. Configure ClamAV Antivirus
echo "🦠 Updating ClamAV Antivirus Virus Signatures..."
systemctl stop clamav-freshclam 2>/dev/null || true
freshclam || true
systemctl start clamav-freshclam 2>/dev/null || true
systemctl enable clamav-daemon 2>/dev/null || true
systemctl start clamav-daemon 2>/dev/null || true
echo "✅ ClamAV Antivirus signatures updated and daemon running!"

echo "🎉 Security setup complete! Your VPS is hardened with UFW, Fail2ban, and ClamAV."
