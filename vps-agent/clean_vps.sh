#!/usr/bin/env bash
# =============================================================================
# SearchBiz VPS Deep Cleaner & Anti-Freeze Optimization Script
# =============================================================================
set -e

echo "🧹 Starting Deep VPS Cleanup & Memory Optimization..."

# 1. Kill any stuck apt-get, dpkg, or hanging download processes
echo "🛑 Terminating stuck background apt/dpkg processes..."
killall apt apt-get dpkg 2>/dev/null || true
sleep 1

# 2. Unlock package managers
echo "🔓 Removing stale package locks..."
rm -f /var/lib/apt/lists/lock
rm -f /var/cache/apt/archives/lock
rm -f /var/lib/dpkg/lock
rm -f /var/lib/dpkg/lock-frontend
dpkg --configure -a 2>/dev/null || true

# 3. Clean APT cache and orphaned packages
echo "📦 Cleaning APT package cache..."
apt-get clean -y 2>/dev/null || true
apt-get autoclean -y 2>/dev/null || true
apt-get autoremove --purge -y 2>/dev/null || true

# 4. Clean Systemd journal logs (keep only last 50MB)
echo "📜 Vacuuming bloated system journal logs..."
if command -v journalctl &> /dev/null; then
    journalctl --vacuum-size=50M 2>/dev/null || true
    journalctl --vacuum-time=2d 2>/dev/null || true
fi

# 5. Clean /tmp and /var/tmp junk safely
echo "🗑️ Purging temporary files in /tmp and /var/tmp..."
find /tmp -type f -atime +2 -delete 2>/dev/null || true
find /var/tmp -type f -atime +2 -delete 2>/dev/null || true

# 6. Clean Docker junk if Docker is installed
if command -v docker &> /dev/null; then
    echo "🐳 Pruning unused Docker containers, networks, and build cache..."
    docker system prune -f 2>/dev/null || true
fi

# 7. Check / create Swap memory to prevent Contabo VPS from freezing under load
SWAP_EXISTS=$(free -m | awk '/Swap:/ {print $2}')
if [ "$SWAP_EXISTS" -eq "0" ] || [ -z "$SWAP_EXISTS" ]; then
    echo "💾 No SWAP detected! Creating a fast 2GB swapfile to stop VPS freezing..."
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null || true
    if [ -f /swapfile ]; then
        chmod 600 /swapfile
        mkswap /swapfile 2>/dev/null || true
        swapon /swapfile 2>/dev/null || true
        if ! grep -q '/swapfile' /etc/fstab; then
            echo '/swapfile none swap sw 0 0' >> /etc/fstab
        fi
        echo "✅ 2GB SWAP enabled! (Prevents memory exhaustion freezes)"
    fi
else
    echo "✅ SWAP memory active (${SWAP_EXISTS} MB)."
fi

# 8. Flush Linux kernel RAM cache and buffers
echo "⚡ Flushing RAM cache and freeing inactive memory buffers..."
sync
echo 3 > /proc/sys/vm/drop_caches

echo ""
echo "🎉 VPS Cleanup complete!"
echo "---------------------------------------------------------"
free -h
echo "---------------------------------------------------------"
df -h /
echo "---------------------------------------------------------"
