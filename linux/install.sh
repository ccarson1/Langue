#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LANGUE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$LANGUE_DIR" || exit 1

while true; do

    clear

    echo
    echo "========================================"
    echo " Langue Installation"
    echo "========================================"
    echo

    # ----------------------------------------
    # Check Python environment
    # ----------------------------------------

    if [ ! -f "env/bin/python" ]; then
        echo "ERROR: Python virtual environment not found."
        echo "Expected: $LANGUE_DIR/env/bin/python"
        echo
        read -p "Press Enter to quit..."
        exit 1
    fi

    echo "Installing common Langue dependencies..."
    echo

    env/bin/python -m pip install -r "dependencies/requirements.txt"

    if [ $? -ne 0 ]; then
        echo
        echo "ERROR: Common dependency installation failed."
        echo
        read -p "Press Enter to quit..."
        exit 1
    fi

    echo
    echo "Common Langue dependencies installed successfully."
    echo

    echo "Choose installation type:"
    echo
    echo "  1. GPU (NVIDIA)"
    echo "  2. CPU only"
    echo "  3. Quit"
    echo

    read -p "Enter choice [1-3]: " INSTALL_TYPE

    case "$INSTALL_TYPE" in

        1)
            echo
            echo "========================================"
            echo " NVIDIA GPU Installation"
            echo "========================================"
            echo

            bash "$SCRIPT_DIR/install_paddle_gpu.sh"
            RESULT=$?

            if [ $RESULT -eq 0 ]; then
                echo
                echo "PaddlePaddle GPU installation completed."
                echo
                read -p "Press Enter to continue..."
                continue
            fi

            if [ $RESULT -eq 2 ]; then
                echo
                echo "Installation cancelled."
                echo
                echo "  1. Restart installer"
                echo "  2. Quit"
                echo

                read -p "Enter choice [1-2]: " CANCEL_CHOICE

                if [ "$CANCEL_CHOICE" = "1" ]; then
                    continue
                fi

                echo
                echo "Installation cancelled."
                exit 0
            fi

            echo
            echo "ERROR: PaddlePaddle GPU installation failed."
            echo
            echo "  1. Restart installer"
            echo "  2. Quit"
            echo

            read -p "Enter choice [1-2]: " ERROR_CHOICE

            if [ "$ERROR_CHOICE" = "1" ]; then
                continue
            fi

            exit 1
            ;;

        2)
            echo
            echo "========================================"
            echo " CPU Installation"
            echo "========================================"
            echo

            bash "$SCRIPT_DIR/install_paddle_cpu.sh"
            RESULT=$?

            if [ $RESULT -eq 0 ]; then
                echo
                echo "PaddlePaddle CPU installation completed."
                echo
                read -p "Press Enter to continue..."
                continue
            fi

            if [ $RESULT -eq 2 ]; then
                echo
                echo "Installation cancelled."
                echo
                echo "  1. Restart installer"
                echo "  2. Quit"
                echo

                read -p "Enter choice [1-2]: " CANCEL_CHOICE

                if [ "$CANCEL_CHOICE" = "1" ]; then
                    continue
                fi

                echo
                echo "Installation cancelled."
                exit 0
            fi

            echo
            echo "ERROR: PaddlePaddle CPU installation failed."
            echo
            echo "  1. Restart installer"
            echo "  2. Quit"
            echo

            read -p "Enter choice [1-2]: " ERROR_CHOICE

            if [ "$ERROR_CHOICE" = "1" ]; then
                continue
            fi

            exit 1
            ;;

        3)
            echo
            echo "Installation cancelled."
            echo
            exit 0
            ;;

        *)
            echo
            echo "Invalid choice."
            echo "Please enter 1, 2, or 3."
            echo
            read -p "Press Enter to continue..."
            ;;

    esac

done