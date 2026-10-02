```bat
@echo off

setlocal

title Langue Installation

cd /d "%~dp0\.."

echo.

echo ========================================

echo  Langue Installation

echo ========================================

echo.

REM ----------------------------------------
REM Install common dependencies
REM ----------------------------------------

echo ========================================

echo  Installing Langue dependencies

echo ========================================

echo.

if not exist "env\Scripts\python.exe" (
    echo ERROR: Python virtual environment not found.
    echo Expected:
    echo     %CD%\env\Scripts\python.exe
    echo.
    pause
    exit /b 1
)

echo Installing dependencies from:
echo     dependencies\requirements.txt
echo.

env\Scripts\python.exe -m pip install -r "dependencies\requirements.txt"

if errorlevel 1 (
    echo.
    echo ERROR: Common dependency installation failed.
    echo.
    pause
    exit /b 1
)

echo.
echo Common dependencies installed successfully.
echo.

REM ----------------------------------------
REM Choose installation type
REM ----------------------------------------

echo ========================================

echo  Choose installation type

echo ========================================

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
```
