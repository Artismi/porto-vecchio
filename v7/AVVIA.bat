@echo off
rem Avvia Porto Vecchio con server proxy IA (Node.js) e apre il browser.
cd /d "%~dp0"
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
  start "" "http://localhost:8642"
  node "%~dp0server.js"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
)
