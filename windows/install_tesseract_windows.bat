@echo off
setlocal

echo.
echo ========================================
echo  Langue - Tesseract OCR
echo  Windows Installation
echo ========================================
echo.

REM ----------------------------------------
REM Check whether Tesseract is already installed
REM ----------------------------------------

where tesseract >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo Tesseract is already installed.
    echo.
    tesseract --version
    goto :verify
)

REM ----------------------------------------
REM Check common installation location
REM ----------------------------------------

if exist "%ProgramFiles%\Tesseract-OCR\tesseract.exe" (
    set "PATH=%ProgramFiles%\Tesseract-OCR;%PATH%"
    echo Tesseract installation found.
    echo.
    "%ProgramFiles%\Tesseract-OCR\tesseract.exe" --version
    goto :verify
)

REM ----------------------------------------
REM Check winget
REM ----------------------------------------

where winget >nul 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: winget was not found.
    echo.
    echo Windows App Installer is required.
    echo.
    pause
    exit /b 1
)

REM ----------------------------------------
REM Install Tesseract
REM ----------------------------------------

echo Tesseract was not found.
echo.
echo Installing Tesseract using winget...
echo.

winget install -e --id tesseract-ocr.tesseract --silent --accept-package-agreements --accept-source-agreements

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Tesseract installation failed.
    echo.
    pause
    exit /b 1
)

REM ----------------------------------------
REM Refresh PATH
REM ----------------------------------------

if exist "%ProgramFiles%\Tesseract-OCR\tesseract.exe" (
    set "PATH=%ProgramFiles%\Tesseract-OCR;%PATH%"
)

echo.
echo Tesseract installation completed.
echo.

:verify

REM ----------------------------------------
REM Verify Tesseract
REM ----------------------------------------

where tesseract >nul 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Tesseract was installed but could not be found.
    echo.
    pause
    exit /b 1
)

echo Tesseract version:
tesseract --version

echo.
echo Installed languages:
echo.

tesseract --list-langs

echo.

tesseract --list-langs | findstr /i /x "lit" >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo Lithuanian language data found.
) else (
    echo WARNING: Lithuanian language data was not found.
)

echo.
echo ========================================
echo  Tesseract installation check complete
echo ========================================
echo.

exit /b 0