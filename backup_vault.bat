@echo off
setlocal
echo ========================================================
echo   TweetVault - One-Click Vault Backup
echo ========================================================
echo.

set "SOURCE_DIR=%APPDATA%\TweetVault"
set "ZIP_OUT=%~dp0TweetVault_Backup.zip"

if not exist "%SOURCE_DIR%" (
    echo [ERROR] No TweetVault data found at %SOURCE_DIR%
    pause
    exit /b 1
)

echo Packaging database and offline media from:
echo   %SOURCE_DIR%
echo.
echo Output destination:
echo   %ZIP_OUT%
echo.
echo Please wait, archiving...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$src = [System.Environment]::GetFolderPath('ApplicationData') + '\TweetVault';" ^
    "$dest = '%ZIP_OUT%';" ^
    "if (Test-Path $dest) { Remove-Item $dest -Force };" ^
    "$files = @(Get-Item \"$src\tweetvault.db*\" -ErrorAction SilentlyContinue); " ^
    "if (Test-Path \"$src\media\") { $files += (Get-Item \"$src\media\") };" ^
    "Compress-Archive -Path $files -DestinationPath $dest -Force;" ^
    "$size = (Get-Item $dest).Length / 1MB; " ^
    "Write-Host ('Backup completed successfully! Size: {0:N2} MB' -f $size)"

echo.
echo ========================================================
echo [SUCCESS] Your entire vault has been backed up to:
echo   TweetVault_Backup.zip
echo.
echo Copy TweetVault_Backup.zip + restore_vault.bat to any PC!
echo ========================================================
echo.
pause

