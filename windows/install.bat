@echo off
setlocal

title Langue Installation

echo.
echo ========================================
echo  Langue Installation
echo ========================================
echo.
echo Choose installation type:
echo.
echo  1. GPU (NVIDIA)
echo  2. CPU only
echo.

choice /C 12 /N /M "Enter choice [1-2]: "

if errorlevel 2 goto CPU
if errorlevel 1 goto GPU

:GPU
echo.
echo ========================================
echo  NVIDIA GPU Installation
echo ========================================
echo.

call "%~dp0install_paddle_gpu.bat"

if errorlevel 1 (
    echo.
    echo ERROR: PaddlePaddle GPU installation failed.
    echo.
    pause
    exit /b 1
)

echo.
echo PaddlePaddle GPU installation completed.
echo.
pause
exit /b 0


:CPU
echo.
echo ========================================
echo  CPU Installation
echo ========================================
echo.

call "%~dp0install_paddle_cpu.bat"

if errorlevel 1 (
    echo.
    echo ERROR: PaddlePaddle CPU installation failed.
    echo.
    pause
    exit /b 1
)

echo.
echo PaddlePaddle CPU installation completed.
echo.
pause
exit /b 0