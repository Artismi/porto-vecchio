@echo off
rem Apre lo Studio (editor.html) di QUESTA cartella.
rem Prima spegne qualunque server sia gia' acceso sulla porta 8642 (anche quello di un'altra copia del gioco),
rem poi avvia il server di questa cartella e apre il browser sullo Studio.
cd /d "%~dp0"
echo Spengo il server vecchio sulla porta 8642, se c'e'...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8642 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
timeout /t 1 /nobreak >nul
echo Avvio lo Studio da: %~dp0
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 3; Start-Process 'http://localhost:8642/editor.html'"
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
  node "%~dp0server.js"
  pause
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
)
