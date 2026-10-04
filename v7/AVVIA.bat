@echo off
rem Avvia Porto Vecchio con server proxy IA (Node.js) e apre il browser.
rem La finestra nera che resta aperta e' il server: dice se la Mente (IA) funziona.
cd /d "%~dp0"
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
  start "" "http://localhost:8642"
  node "%~dp0server.js"
  pause
) else (
  echo.
  echo  ATTENZIONE: Node.js non e' installato, quindi la Mente degli NPC ^(IA^) resta spenta.
  echo  Il gioco parte lo stesso. Per accendere l'IA installa Node.js LTS da https://nodejs.org
  echo  e poi riapri AVVIA.bat.
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
)
