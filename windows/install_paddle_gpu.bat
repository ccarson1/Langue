```bat
@echo off
setlocal

cd /d "%~dp0\.."

echo.
echo ========================================
echo  Langue - PaddlePaddle Windows GPU
echo ========================================
echo.

echo Checking system...
echo.

REM ----------------------------------------
REM Check Python environment
REM ----------------------------------------

if not exist "env\Scripts\python.exe" (
    echo ERROR: Python virtual environment not found.
    echo Expected: %CD%\env\Scripts\python.exe
    echo.
    pause
    exit /b 1
)

echo Python virtual environment:
echo     %CD%\env\Scripts\python.exe
echo.

REM ----------------------------------------
REM Check NVIDIA
REM ----------------------------------------

echo Checking for NVIDIA GPU...
echo.

where nvidia-smi >nul 2>&1

if errorlevel 1 (
    echo ERROR: NVIDIA drivers were not detected.
    echo.
    echo The NVIDIA 'nvidia-smi' command was not found.
    echo.
    echo Please return to the main installer and select:
    echo.
    echo     2. CPU only
    echo.
    pause
    exit /b 1
)

echo NVIDIA GPU detected.
echo.

REM ----------------------------------------
REM Get GPU information
REM ----------------------------------------

echo ========================================
echo  Hardware Information
echo ========================================
echo.

nvidia-smi --query-gpu=name,driver_version --format=csv,noheader

if errorlevel 1 (
    echo.
    echo ERROR: Unable to query NVIDIA GPU.
    echo.
    pause
    exit /b 1
)

echo.

REM ----------------------------------------
REM Get CUDA information
REM ----------------------------------------

echo ========================================
echo  CUDA Information
echo ========================================
echo.

nvidia-smi | findstr /C:"CUDA Version"

if errorlevel 1 (
    echo.
    echo ERROR: Unable to determine CUDA compatibility.
    echo.
    pause
    exit /b 1
)

echo.

REM ----------------------------------------
REM Paddle information
REM ----------------------------------------

echo ========================================
echo  PaddlePaddle Installation
echo ========================================
echo.

echo PaddlePaddle version:
echo     3.2.2
echo.

echo CUDA package:
echo     cu126
echo.

echo Installation source:
echo     https://www.paddlepaddle.org.cn/packages/stable/cu126/
echo.

REM ----------------------------------------
REM Confirmation
REM ----------------------------------------

echo ========================================
echo  Installation Summary
echo ========================================
echo.

echo The following will be installed:
echo.
echo     PaddlePaddle 3.2.2
echo     NVIDIA GPU build
echo     CUDA 12.6 build
echo.

echo The existing PaddlePaddle installation,
echo if present, may be replaced.
echo.

choice /C YN /N /M "Continue with installation? [Y/N]: "

if errorlevel 2 (
    echo.
    echo Installation cancelled.
    echo.
    exit /b 2
)

echo.
echo ========================================
echo  Installing PaddlePaddle GPU
echo ========================================
echo.

env\Scripts\python.exe -m pip install paddlepaddle-gpu==3.2.2 -i https://www.paddlepaddle.org.cn/packages/stable/cu126/

if errorlevel 1 (
    echo.
    echo ERROR: PaddlePaddle installation failed.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Installation successful
echo ========================================
echo.

echo Verifying PaddlePaddle...
echo.

env\Scripts\python.exe -c "import paddle; print('PaddlePaddle:', paddle.__version__); print('CUDA available:', paddle.is_compiled_with_cuda()); print('Device:', paddle.device.get_device())"

if errorlevel 1 (
    echo.
    echo ERROR: PaddlePaddle verification failed.
    echo.
    pause
    exit /b 1
)

REM ----------------------------------------
REM Verify PaddleOCR
REM ----------------------------------------

echo.
echo Verifying PaddleOCR...
echo.

env\Scripts\python.exe -c "from paddleocr import PaddleOCR; print('PaddleOCR import successful'); ocr=PaddleOCR(lang='en'); print('PaddleOCR initialized successfully')"

if errorlevel 1 (
    echo.
    echo ERROR: PaddleOCR verification failed.
    echo.
    pause
    exit /b 1
)

echo.
echo PaddleOCR verification successful.
echo.

REM ----------------------------------------
REM Complete
REM ----------------------------------------

echo ========================================
echo  GPU installation complete
echo ========================================
echo.

pause
exit /b 0
```
