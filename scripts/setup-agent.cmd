@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-agent.ps1"
if errorlevel 1 (
  echo.
  echo Agent setup failed.
  pause
  exit /b 1
)
