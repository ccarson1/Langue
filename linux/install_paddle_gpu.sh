#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LANGUE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$LANGUE_DIR" || exit 1

echo
echo "========================================"
echo " Langue - PaddlePaddle Linux GPU"
echo "========================================"
echo

# ----------------------------------------
# Configure PaddleX model/cache location
# ----------------------------------------

export PADDLE_PDX_CACHE_HOME="$LANGUE_DIR/backend/models/paddleocr"

echo "PaddleX cache directory:"
echo "    $PADDLE_PDX_CACHE_HOME"
echo

mkdir -p "$PADDLE_PDX_CACHE_HOME"

echo "Checking system..."
echo

# ----------------------------------------
# Check Python environment
# ----------------------------------------

if [ ! -f "env/bin/python" ]; then
    echo "ERROR: Python virtual environment not found."
    echo "Expected: $LANGUE_DIR/env/bin/python"
    echo
    read -p "Press Enter to return..."
    exit 1
fi

echo "Python virtual environment:"
echo "    $LANGUE_DIR/env/bin/python"
echo

PYTHON_VERSION=$(env/bin/python --version 2>&1)

echo "Python version:"
echo "    $PYTHON_VERSION"
echo

# ----------------------------------------
# Check NVIDIA
# ----------------------------------------

echo "Checking for NVIDIA GPU..."
echo

if ! command -v nvidia-smi >/dev/null 2>&1; then
    echo "ERROR: NVIDIA drivers were not detected."
    echo
    echo "The NVIDIA 'nvidia-smi' command was not found."
    echo
    echo "Please return to the main installer and select:"
    echo
    echo "    2. CPU only"
    echo
    read -p "Press Enter to return..."
    exit 1
fi

echo "NVIDIA GPU detected."
echo

# ----------------------------------------
# Get GPU information
# ----------------------------------------

echo "========================================"
echo " Hardware Information"
echo "========================================"
echo

GPU_INFO=$(nvidia-smi \
    --query-gpu=name,driver_version \
    --format=csv,noheader 2>/dev/null)

if [ $? -ne 0 ] || [ -z "$GPU_INFO" ]; then
    echo
    echo "ERROR: Unable to query NVIDIA GPU."
    echo
    read -p "Press Enter to return..."
    exit 1
fi

echo "$GPU_INFO"
echo

# ----------------------------------------
# Get CUDA information
# ----------------------------------------

echo "========================================"
echo " CUDA Information"
echo "========================================"
echo

CUDA_INFO=$(nvidia-smi 2>/dev/null | grep -o "CUDA Version: [0-9.]*" | head -n 1)

if [ -z "$CUDA_INFO" ]; then
    echo
    echo "ERROR: Unable to determine CUDA compatibility."
    echo
    read -p "Press Enter to return..."
    exit 1
fi

echo "$CUDA_INFO"
echo

# ----------------------------------------
# Paddle information
# ----------------------------------------

echo "========================================"
echo " PaddlePaddle Installation"
echo "========================================"
echo

echo "PaddlePaddle version:"
echo "    3.2.2"
echo

echo "CUDA package:"
echo "    cu126"
echo

echo "Installation source:"
echo "    https://www.paddlepaddle.org.cn/packages/stable/cu126/"
echo

# ----------------------------------------
# Confirmation
# ----------------------------------------

echo "========================================"
echo " Installation Summary"
echo "========================================"
echo

echo "The following will be installed:"
echo
echo "    PaddlePaddle 3.2.2"
echo "    NVIDIA GPU build"
echo "    CUDA 12.6 build"
echo

echo "Detected hardware:"
echo "    $GPU_INFO"
echo

echo "Detected driver/CUDA:"
echo "    $CUDA_INFO"
echo

echo "PaddleX model/cache directory:"
echo "    $PADDLE_PDX_CACHE_HOME"
echo

echo "The existing PaddlePaddle installation,"
echo "if present, may be replaced."
echo

read -p "Continue with installation? [Y/N]: " CONFIRM

case "$CONFIRM" in
    [Yy])
        ;;
    [Nn])
        echo
        echo "Installation cancelled."
        echo
        exit 2
        ;;
    *)
        echo
        echo "Invalid choice. Installation cancelled."
        echo
        exit 2
        ;;
esac

# ----------------------------------------
# Installation
# ----------------------------------------

echo
echo "========================================"
echo " Installing PaddlePaddle GPU"
echo "========================================"
echo

env/bin/python -m pip install \
    -r "dependencies/requirements-gpu.txt" \
    -i https://www.paddlepaddle.org.cn/packages/stable/cu126/

if [ $? -ne 0 ]; then
    echo
    echo "ERROR: PaddlePaddle GPU installation failed."
    echo
    read -p "Press Enter to return..."
    exit 1
fi

echo
echo "========================================"
echo " Installation successful"
echo "========================================"
echo

# ----------------------------------------
# Verify PaddlePaddle
# ----------------------------------------

echo "Verifying PaddlePaddle..."
echo

env/bin/python -c "
import paddle

print('PaddlePaddle:', paddle.__version__)
print('CUDA available:', paddle.is_compiled_with_cuda())
print('Device:', paddle.device.get_device())
"

if [ $? -ne 0 ]; then
    echo
    echo "ERROR: PaddlePaddle verification failed."
    echo
    read -p "Press Enter to return..."
    exit 1
fi

# ----------------------------------------
# Verify PaddleOCR
# ----------------------------------------

echo
echo "Verifying PaddleOCR..."
echo

env/bin/python -c "
from paddleocr import PaddleOCR

print('PaddleOCR import successful')

ocr = PaddleOCR(lang='en')

print('PaddleOCR initialized successfully')
"

if [ $? -ne 0 ]; then
    echo
    echo "ERROR: PaddleOCR verification failed."
    echo
    read -p "Press Enter to return..."
    exit 1
fi

echo
echo "PaddleOCR verification successful."
echo

# ----------------------------------------
# Complete
# ----------------------------------------

echo "========================================"
echo " GPU installation complete"
echo "========================================"
echo

echo "PaddleX model/cache directory:"
echo "    $PADDLE_PDX_CACHE_HOME"
echo

echo "OCR models are stored under:"
echo "    $PADDLE_PDX_CACHE_HOME/official_models"
echo

exit 0