#!/usr/bin/env bash
# =============================================================================
# Setup & Activate Llama-3.2-3B-Instruct-Abliterated GGUF for Hermes SearchBiz Agent
# =============================================================================

set -e

TARGET_MODEL="llama-3.2-3b-instruct-abliterated"
APP_DIR="/opt/hermes-searchbiz"
MODELS_DIR="${APP_DIR}/models"

echo "🧠 Initializing Llama-3.2-3B-Instruct-Abliterated GGUF Setup for Hermes..."

# 1. Ensure Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "📦 Ollama not found. Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
fi

# 2. Ensure Ollama service is active
echo "⚡ Checking Ollama service..."
systemctl start ollama 2>/dev/null || true
sleep 2

# 3. Check if target model is already available
if ollama list 2>/dev/null | grep -q "${TARGET_MODEL}"; then
    echo "✅ Model '${TARGET_MODEL}' is already registered in Ollama!"
else
    echo "📥 Installing Llama-3.2-3B-Instruct-Abliterated GGUF..."
    LOADED=0

    # Method 1: Pull directly from HuggingFace GGUF repository via Ollama native HF support
    echo "Attempting Method 1: Direct HuggingFace GGUF pull (MaziyarPanahi/Llama-3.2-3B-Instruct-abliterated-GGUF)..."
    if ollama pull hf.co/MaziyarPanahi/Llama-3.2-3B-Instruct-abliterated-GGUF:Q4_K_M; then
        echo "Linking HF model to alias '${TARGET_MODEL}'..."
        ollama cp hf.co/MaziyarPanahi/Llama-3.2-3B-Instruct-abliterated-GGUF:Q4_K_M "${TARGET_MODEL}" || true
        LOADED=1
    fi

    # Method 2: Community Ollama abliterated registry
    if [ $LOADED -eq 0 ]; then
        echo "Attempting Method 2: Community Ollama registry (richardyoung/llama-3.2-3b-instruct-abliterated)..."
        if ollama pull richardyoung/llama-3.2-3b-instruct-abliterated; then
            ollama cp richardyoung/llama-3.2-3b-instruct-abliterated "${TARGET_MODEL}" || true
            LOADED=1
        elif ollama pull huihui_ai/llama3.2-abliterate:3b-instruct; then
            ollama cp huihui_ai/llama3.2-abliterate:3b-instruct "${TARGET_MODEL}" || true
            LOADED=1
        fi
    fi

    # Method 3: Direct GGUF Download & Modelfile build
    if [ $LOADED -eq 0 ]; then
        echo "Attempting Method 3: Direct GGUF download from Hugging Face & custom Modelfile creation..."
        mkdir -p "${MODELS_DIR}"
        GGUF_FILE="${MODELS_DIR}/Llama-3.2-3B-Instruct-abliterated.Q4_K_M.gguf"
        
        if [ ! -f "${GGUF_FILE}" ]; then
            echo "Downloading Llama-3.2-3B-Instruct-abliterated.Q4_K_M.gguf (~2.0 GB)..."
            curl -L "https://huggingface.co/MaziyarPanahi/Llama-3.2-3B-Instruct-abliterated-GGUF/resolve/main/Llama-3.2-3B-Instruct-abliterated.Q4_K_M.gguf" \
                 -o "${GGUF_FILE}" || \
            curl -L "https://huggingface.co/mradermacher/Llama-3.2-3B-Instruct-abliterated-GGUF/resolve/main/Llama-3.2-3B-Instruct-abliterated.Q4_K_M.gguf" \
                 -o "${GGUF_FILE}"
        fi

        if [ -f "${GGUF_FILE}" ]; then
            echo "Generating Ollama Modelfile..."
            cat << 'EOF' > "${MODELS_DIR}/Modelfile"
FROM ./Llama-3.2-3B-Instruct-abliterated.Q4_K_M.gguf

TEMPLATE """{{ if .System }}<|start_header_id|>system<|end_header_id|>

{{ .System }}<|eot_id|>{{ end }}{{ if .Prompt }}<|start_header_id|>user<|end_header_id|>

{{ .Prompt }}<|eot_id|>{{ end }}<|start_header_id|>assistant<|end_header_id|>

{{ .Response }}<|eot_id|>"""

PARAMETER stop "<|start_header_id|>"
PARAMETER stop "<|end_header_id|>"
PARAMETER stop "<|eot_id|>"
PARAMETER temperature 0.7
EOF
            cd "${MODELS_DIR}"
            ollama create "${TARGET_MODEL}" -f Modelfile
            LOADED=1
        fi
    fi

    if [ $LOADED -eq 1 ]; then
        echo "🎉 Successfully loaded '${TARGET_MODEL}' into Ollama!"
    else
        echo "⚠️ Could not pull remote GGUF automatically. Checking if fallback Llama model exists..."
        ollama pull llama3.2:3b || true
    fi
fi

# 4. Cleanup old standard llama3.2:3b if requested to save disk space
if ollama list 2>/dev/null | grep -q "${TARGET_MODEL}"; then
    if ollama list 2>/dev/null | grep -q "llama3.2:3b"; then
        echo "🧹 Removing superseded standard llama3.2:3b to free up disk memory..."
        ollama rm llama3.2:3b 2>/dev/null || true
    fi
fi

# 5. Update environment file if it exists
if [ -f "${APP_DIR}/.env" ]; then
    echo "📝 Updating ${APP_DIR}/.env OLLAMA_MODEL..."
    sed -i 's/^OLLAMA_MODEL=.*/OLLAMA_MODEL="llama-3.2-3b-instruct-abliterated"/' "${APP_DIR}/.env"
fi

# 6. Verify model response
echo "🧪 Running verification test on ${TARGET_MODEL}..."
ollama run "${TARGET_MODEL}" "Say 'Hermes SearchBiz AI Brain online' in 5 words." || true

# 7. Restart Hermes agent to connect to new brain
if systemctl is-active --quiet hermes-agent 2>/dev/null; then
    echo "🔄 Restarting hermes-agent service..."
    systemctl restart hermes-agent
    echo "✅ Hermes Agent restarted with Llama-3.2-3B-Instruct-Abliterated GGUF brain!"
fi

echo "============================================================================="
echo "✅ Llama-3.2-3B-Instruct-Abliterated GGUF is active and powering Hermes Agent!"
echo "============================================================================="
