@echo off

setlocal

title Langue - Piper Lithuanian TTS

cd /d "%~dp0\.."

echo.
echo ========================================
echo  Langue - Piper Lithuanian TTS
echo ========================================
echo.

echo Downloading Lithuanian Piper voice...
echo.

python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='RobertasTa/lt_LT-reginute1-medium', local_dir='backend/models/piper/lt_LT-reginute1-medium')"

if errorlevel 1 (
    echo.
    echo ERROR: Failed to download the Lithuanian Piper voice.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Piper voice installation complete!
echo ========================================
echo.

pause