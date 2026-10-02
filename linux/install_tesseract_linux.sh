#!/bin/bash

set -e

echo
echo "========================================"
echo " Langue - Tesseract OCR"
echo " Linux Installation"
echo "========================================"
echo

# ----------------------------------------
# Check whether Tesseract is already installed
# ----------------------------------------

if command -v tesseract >/dev/null 2>&1; then

    echo "Tesseract is already installed."
    echo
    tesseract --version
    echo

else

    echo "Tesseract was not found."
    echo

    # ----------------------------------------
    # Detect package manager
    # ----------------------------------------

    if command -v apt-get >/dev/null 2>&1; then

        echo "Detected Debian/Ubuntu-based Linux."
        echo
        echo "Installing Tesseract..."
        echo

        sudo apt-get update
        sudo apt-get install -y \
            tesseract-ocr \
            tesseract-ocr-eng \
            tesseract-ocr-lit

    elif command -v dnf >/dev/null 2>&1; then

        echo "Detected Fedora/RHEL-based Linux."
        echo
        echo "Installing Tesseract..."
        echo

        sudo dnf install -y \
            tesseract \
            tesseract-langpack-eng \
            tesseract-langpack-lit

    elif command -v yum >/dev/null 2>&1; then

        echo "Detected yum-based Linux."
        echo
        echo "Installing Tesseract..."
        echo

        sudo yum install -y \
            tesseract \
            tesseract-langpack-eng \
            tesseract-langpack-lit

    elif command -v pacman >/dev/null 2>&1; then

        echo "Detected Arch Linux."
        echo
        echo "Installing Tesseract..."
        echo

        sudo pacman -Sy --needed tesseract tesseract-data-eng tesseract-data-lit

    elif command -v zypper >/dev/null 2>&1; then

        echo "Detected openSUSE."
        echo
        echo "Installing Tesseract..."
        echo

        sudo zypper install -y \
            tesseract-ocr \
            tesseract-ocr-traineddata-english \
            tesseract-ocr-traineddata-lithuanian

    else

        echo "ERROR: Could not determine the Linux package manager."
        echo
        echo "Please install Tesseract manually."
        echo
        exit 1

    fi
fi

# ----------------------------------------
# Verify Tesseract
# ----------------------------------------

echo
echo "========================================"
echo " Verifying Tesseract"
echo "========================================"
echo

if ! command -v tesseract >/dev/null 2>&1; then
    echo "ERROR: Tesseract installation failed."
    exit 1
fi

echo "Tesseract version:"
tesseract --version

echo
echo "Installed languages:"
echo

tesseract --list-langs

echo

# ----------------------------------------
# Verify Lithuanian
# ----------------------------------------

if tesseract --list-langs 2>/dev/null | grep -qx "lit"; then

    echo "Lithuanian language data found."

else

    echo "WARNING: Lithuanian language data was not found."
    echo
    echo "Tesseract is installed, but Lithuanian OCR data"
    echo "could not be detected."

fi

echo
echo "========================================"
echo " Tesseract installation complete"
echo "========================================"
echo