#!/usr/bin/env bash
# =============================================================================
# SearchBiz Open-Source VPS, Port & Visitor Live Monitor CLI
# =============================================================================
set -e

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

show_banner() {
    echo -e "${CYAN}${BOLD}===================================================================${NC}"
    echo -e "${CYAN}${BOLD}          SEARCHBIZ VPS, PORT & TRAFFIC MONITOR (OPEN-SOURCE)     ${NC}"
    echo -e "${CYAN}${BOLD}===================================================================${NC}"
}

show_resources() {
    echo -e "\n${BOLD}${GREEN}🖥️  VPS SYSTEM RESOURCES:${NC}"
    echo -e "• Uptime: $(uptime -p 2>/dev/null || uptime)"
    
    # Load Average
    LOAD=$(cat /proc/loadavg | awk '{print $1", "$2", "$3}')
    echo -e "• CPU Load (1m, 5m, 15m): ${YELLOW}${LOAD}${NC}"
    
    # Memory
    if command -v free &> /dev/null; then
        MEM_INFO=$(free -m | awk 'NR==2{printf "Used: %s MB / Total: %s MB (%.1f%%)", $3, $2, $3*100/$2 }')
        echo -e "• Memory (RAM): ${YELLOW}${MEM_INFO}${NC}"
    fi

    # Disk
    DISK_INFO=$(df -h / | awk 'NR==2{printf "Used: %s / Total: %s (Usage: %s)", $3, $2, $5}')
    echo -e "• Disk Storage (/): ${YELLOW}${DISK_INFO}${NC}"
}

show_ports() {
    echo -e "\n${BOLD}${PURPLE}🔌  ACTIVE LISTENING PORTS & SERVICES:${NC}"
    echo -e "-------------------------------------------------------------------"
    printf "%-10s %-25s %-25s\n" "PORT" "BIND ADDRESS" "PROCESS/SERVICE"
    echo -e "-------------------------------------------------------------------"
    
    if command -v ss &> /dev/null; then
        ss -tulpn 2>/dev/null | grep -E 'LISTEN|UNCONN' | awk '{
            split($5, a, ":");
            port = a[length(a)];
            printf "%-10s %-25s %-25s\n", port, $5, $7
        }' | sort -n -u -k1,1 | head -n 25
    elif command -v netstat &> /dev/null; then
        netstat -tulpn 2>/dev/null | grep LISTEN | awk '{
            split($4, a, ":");
            port = a[length(a)];
            printf "%-10s %-25s %-25s\n", port, $4, $7
        }' | sort -n -u -k1,1 | head -n 25
    fi
}

show_visitors() {
    echo -e "\n${BOLD}${CYAN}🌐  WEB VISITOR ANALYTICS (NGINX ACCESS LOGS):${NC}"
    
    LOG_FILE=""
    for candidate in /var/log/nginx/access.log /var/log/nginx/searchbiz.access.log /var/log/httpd/access_log; do
        if [ -f "$candidate" ] && [ -s "$candidate" ]; then
            LOG_FILE="$candidate"
            break
        fi
    done

    if [ -z "$LOG_FILE" ]; then
        echo -e "• Web server access log not found or empty."
        return
    fi

    TODAY=$(date '+%d/%b/%Y')
    TOTAL_REQUESTS=$(grep "$TODAY" "$LOG_FILE" 2>/dev/null | wc -l || echo "0")
    UNIQUE_IPS=$(grep "$TODAY" "$LOG_FILE" 2>/dev/null | awk '{print $1}' | sort -u | wc -l || echo "0")

    echo -e "• Log Path: ${YELLOW}${LOG_FILE}${NC}"
    echo -e "• Today's Total Page Views: ${GREEN}${TOTAL_REQUESTS}${NC}"
    echo -e "• Today's Unique Visitor IPs: ${GREEN}${UNIQUE_IPS}${NC}"

    echo -e "\n${BOLD}Top 5 Visitor IP Addresses Today:${NC}"
    grep "$TODAY" "$LOG_FILE" 2>/dev/null | awk '{print $1}' | sort | uniq -c | sort -nr | head -n 5 | awk '{printf "  • IP %-18s (%s requests)\n", $2, $1}' || echo "  (No traffic recorded yet)"

    echo -e "\n${BOLD}Top 5 Visited URL Paths:${NC}"
    grep "$TODAY" "$LOG_FILE" 2>/dev/null | awk '{print $7}' | sort | uniq -c | sort -nr | head -n 5 | awk '{printf "  • %-30s (%s hits)\n", $2, $1}' || echo "  (No paths recorded yet)"

    echo -e "\n${BOLD}Recent 3 Visitors Live:${NC}"
    tail -n 3 "$LOG_FILE" 2>/dev/null | awk '{printf "  • [%s] %s -> %s (Status: %s)\n", $4, $1, $7, $9}' || true
}

show_security() {
    echo -e "\n${BOLD}${RED}🛡️  SECURITY POSTURE & ATTACK MONITOR:${NC}"
    
    # UFW Status
    if command -v ufw &> /dev/null; then
        UFW_ST=$(ufw status | head -n 1)
        echo -e "• UFW Firewall: ${YELLOW}${UFW_ST}${NC}"
    fi

    # Fail2ban Status
    if command -v fail2ban-client &> /dev/null; then
        JAILS=$(fail2ban-client status 2>/dev/null | grep "Jail list" | cut -d: -f2 | xargs || echo "None")
        echo -e "• Fail2ban Active Jails: ${YELLOW}${JAILS}${NC}"
    fi

    # Suspicious web probes in Nginx log
    if [ -n "$LOG_FILE" ]; then
        ATTACKS=$(grep -E -i 'wp-login|xmlrpc|\.env|eval|union\s+select|<script|\.\./|passwd' "$LOG_FILE" 2>/dev/null | wc -l || echo "0")
        echo -e "• Blocked/Detected Malicious Web Probes: ${RED}${ATTACKS}${NC}"
    fi
}

case "$1" in
    --ports)
        show_banner
        show_ports
        ;;
    --visitors)
        show_banner
        show_visitors
        ;;
    --security)
        show_banner
        show_security
        ;;
    *)
        show_banner
        show_resources
        show_ports
        show_visitors
        show_security
        echo -e "\n${CYAN}Run with --ports, --visitors, or --security for focused inspection.${NC}"
        ;;
esac
