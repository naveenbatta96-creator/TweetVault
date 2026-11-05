@echo off
setlocal
echo ========================================================
echo   TweetVault - One-Click Vault Restore
echo ========================================================
echo.

set "ZIP_IN=%~dp0TweetVault_Backup.zip"
set "TARGET_DIR=%APPDATA%\TweetVault"

if not exist "%ZIP_IN%" (
    echo [ERROR] Backup archive not found:
    echo   %ZIP_IN%
    echo.
    echo Please make sure TweetVault_Backup.zip is in the same folder as this script.
    pause
    exit /b 1
)

echo Restoring vault from:
echo   %ZIP_IN%
echo.
echo Destination:
echo   %TARGET_DIR%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$zip = '%ZIP_IN%';" ^
    "$dest = [System.Environment]::GetFolderPath('ApplicationData') + '\TweetVault';" ^
    "if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null };" ^
    "Expand-Archive -Path $zip -DestinationPath $dest -Force;" ^
    "Write-Host 'Extraction completed successfully!'"

echo.
echo ========================================================
echo [SUCCESS] Your vault has been restored on this computer!
echo Launch TweetVault.exe to view all your archived tweets and media.
echo ========================================================
echo.
pause

