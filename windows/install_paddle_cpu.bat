@echo off
setlocal

cd /d "%~dp0\.."

echo.
echo ========================================
echo  Langue - PaddlePaddle Windows CPU
echo ========================================
echo.

REM ----------------------------------------
REM Configure PaddleX model/cache location
REM ----------------------------------------

set "PADDLE_PDX_CACHE_HOME=%CD%\backend\models\paddleocr"

echo PaddleX cache directory:
echo     %PADDLE_PDX_CACHE_HOME%
echo.

if not exist "%PADDLE_PDX_CACHE_HOME%" (
    mkdir "%PADDLE_PDX_CACHE_HOME%"
)

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
REM Get Python information
REM ----------------------------------------

echo Python version:
echo.

env\Scripts\python.exe --version

if errorlevel 1 (
    echo.
    echo ERROR: Unable to determine Python version.
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

echo Build:
echo     CPU
echo.

echo Installation source:
echo     https://www.paddlepaddle.org.cn/packages/stable/cpu/
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
echo     CPU build
echo.

echo PaddleX model/cache directory:
echo     %PADDLE_PDX_CACHE_HOME%
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
echo  Installing PaddlePaddle CPU
echo ========================================
echo.

env\Scripts\python.exe -m pip install paddlepaddle==3.2.2 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/

if errorlevel 1 (
    echo.
    echo ERROR: PaddlePaddle CPU installation failed.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Installation successful
echo ========================================
echo.

REM ----------------------------------------
REM Verify PaddlePaddle
REM ----------------------------------------

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
echo  CPU installation complete
echo ========================================
echo.

echo PaddleX model/cache directory:
echo     %PADDLE_PDX_CACHE_HOME%
echo.

echo OCR models are stored under:
echo     %PADDLE_PDX_CACHE_HOME%\official_models
echo.

pause
exit /b 0