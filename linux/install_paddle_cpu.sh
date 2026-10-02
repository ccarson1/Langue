#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LANGUE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$LANGUE_DIR" || exit 1

echo
echo "========================================"
echo " Langue - PaddlePaddle Linux CPU"
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

# ----------------------------------------
# Check Python virtual environment
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
# Paddle information
# ----------------------------------------

echo "========================================"
echo " PaddlePaddle Installation"
echo "========================================"
echo

echo "PaddlePaddle version:"
echo "    3.2.2"
echo

echo "Build:"
echo "    CPU"
echo

echo "Installation source:"
echo "    PyPI"
echo

# ----------------------------------------
# Installation summary
# ----------------------------------------

echo "========================================"
echo " Installation Summary"
echo "========================================"
echo

echo "The following will be installed:"
echo
echo "    PaddlePaddle 3.2.2"
echo "    CPU build"
echo

echo "PaddleX model/cache directory:"
echo "    $PADDLE_PDX_CACHE_HOME"
echo

echo "The existing PaddlePaddle installation,"
echo "if present, may be replaced."
echo

# ----------------------------------------
# Confirmation
# ----------------------------------------

echo "========================================"
echo " Confirmation"
echo "========================================"
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
echo " Installing PaddlePaddle CPU"
echo "========================================"
echo

env/bin/python -m pip install \
    -r "dependencies/requirements-cpu.txt"

if [ $? -ne 0 ]; then
    echo
    echo "ERROR: PaddlePaddle CPU installation failed."
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
echo " CPU installation complete"
echo "========================================"
echo

echo "PaddleX model/cache directory:"
echo "    $PADDLE_PDX_CACHE_HOME"
echo

echo "OCR models are stored under:"
echo "    $PADDLE_PDX_CACHE_HOME/official_models"
echo

exit 0