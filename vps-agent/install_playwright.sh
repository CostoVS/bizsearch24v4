#!/usr/bin/env bash
# ==============================================================================
# SearchBiz Hermes Agent - Playwright Stealth Chromium Installer
# Installs Playwright & Headless Chromium with system dependencies for stealth
# visual scraping of Google Maps.
# ==============================================================================

set -e

echo "🎭 Starting Playwright Stealth Chromium Setup..."

# Ensure pip is present
python3 -m pip --version >/dev/null 2>&1 || {
    echo "📦 Installing python3-pip..."
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update -y && sudo apt-get install -y python3-pip
    fi
}

echo "📦 Installing Playwright Python package..."
python3 -m pip install --break-system-packages playwright

echo "🌐 Installing Chromium browser and system dependencies..."
python3 -m playwright install chromium
python3 -m playwright install-deps chromium || true

echo "✅ Playwright Stealth Chromium installation completed!"
echo "🚀 Hermes can now visually scroll maps.google.com with human mouse-wheel simulation!"
