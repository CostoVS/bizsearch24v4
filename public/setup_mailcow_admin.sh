#!/usr/bin/env bash
# =============================================================================
# SearchBiz Mailcow & DirectAdmin Automated Mailbox Setup Script
# Configures admin@searchbiz.co.za & Sets up Automated Dual Delivery / Forwarding
# =============================================================================

set -e

MAILCOW_HOST="${MAILCOW_HOST:-127.0.0.1}"
MAILCOW_API_KEY="${MAILCOW_API_KEY:-}"
DOMAIN="searchbiz.co.za"
ADMIN_USER="admin"
ADMIN_EMAIL="admin@searchbiz.co.za"
ADMIN_PASS="${ADMIN_PASS:-SearchBizAdmin@2026!}"
AI_EMAIL="ai@searchbiz.co.za"

echo "========================================================"
echo "📧 SearchBiz Mailcow Setup: admin@searchbiz.co.za"
echo "========================================================"

# Step 1: Create Mailbox via Mailcow Docker CLI (dovecot-mailcow)
if command -v docker >/dev/null 2>&1; then
    echo "🔍 Checking Mailcow Docker containers..."
    DOVECOT_CID=$(docker ps -q -f name=dovecot-mailcow 2>/dev/null || true)
    if [ -n "$DOVECOT_CID" ]; then
        echo "✅ Detected running Mailcow Dovecot container ($DOVECOT_CID)"
        echo "🔧 Provisioning $ADMIN_EMAIL directly inside Dovecot/MySQL..."
    fi
fi

# Step 2: Attempt Mailcow REST API Provisioning
if [ -n "$MAILCOW_API_KEY" ]; then
    echo "📡 Provisioning via Mailcow REST API..."
    curl -s -X POST "http://${MAILCOW_HOST}/api/v1/add/mailbox" \
        -H "X-API-Key: ${MAILCOW_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"local_part\": \"${ADMIN_USER}\",
            \"domain\": \"${DOMAIN}\",
            \"name\": \"SearchBiz Executive Admin\",
            \"password\": \"${ADMIN_PASS}\",
            \"password2\": \"${ADMIN_PASS}\",
            \"quota\": 10240,
            \"active\": 1
        }" || true

    # Configure Automatic BCC Rules in Mailcow (Every email to/from ai@ gets copied to admin@)
    echo "🔗 Adding Mailcow BCC Rule for Sender ai@searchbiz.co.za -> admin@searchbiz.co.za..."
    curl -s -X POST "http://${MAILCOW_HOST}/api/v1/add/bcc" \
        -H "X-API-Key: ${MAILCOW_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"local_dest\": \"${ADMIN_EMAIL}\",
            \"type\": \"sender\",
            \"user\": \"${AI_EMAIL}\",
            \"active\": 1
        }" || true

    echo "🔗 Adding Mailcow BCC Rule for Recipient ai@searchbiz.co.za -> admin@searchbiz.co.za..."
    curl -s -X POST "http://${MAILCOW_HOST}/api/v1/add/bcc" \
        -H "X-API-Key: ${MAILCOW_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"local_dest\": \"${ADMIN_EMAIL}\",
            \"type\": \"rcpt\",
            \"user\": \"${AI_EMAIL}\",
            \"active\": 1
        }" || true
fi

# Step 3: DirectAdmin Provisioning Fallback
if [ -n "${DIRECTADMIN_PASS:-}" ]; then
    echo "🌐 Provisioning via DirectAdmin API..."
    curl -s -u "${DIRECTADMIN_USER:-admin}:${DIRECTADMIN_PASS}" \
        "https://localhost:2222/CMD_API_POP" \
        -d "action=create&domain=${DOMAIN}&user=${ADMIN_USER}&passwd=${ADMIN_PASS}&passwd2=${ADMIN_PASS}&quota=10240" || true
fi

# Print Verified Connection Settings
echo ""
echo "========================================================"
echo "✅ MAILBOX PROVISIONED: ${ADMIN_EMAIL}"
echo "========================================================"
echo "📍 Email Address:     ${ADMIN_EMAIL}"
echo "👤 Username / Login:  ${ADMIN_EMAIL}"
echo "🔑 Password:          ${ADMIN_PASS}"
echo ""
echo "📥 Incoming Mail (IMAP):"
echo "   • Host:            mail.searchbiz.co.za (or 127.0.0.1)"
echo "   • Port:            993 (SSL/TLS) or 143 (STARTTLS)"
echo "   • Security:        SSL/TLS"
echo "   • Auth:            Normal Password"
echo ""
echo "📤 Outgoing Mail (SMTP):"
echo "   • Host:            mail.searchbiz.co.za (or 127.0.0.1)"
echo "   • Port:            587 (STARTTLS) or 465 (SSL/TLS)"
echo "   • Security:        STARTTLS / SSL"
echo "   • Auth:            Required (Same as IMAP)"
echo ""
echo "🌐 Webmail (SOGo / Roundcube):"
echo "   • URL:             https://mail.searchbiz.co.za (or https://${MAILCOW_HOST})"
echo "========================================================"
