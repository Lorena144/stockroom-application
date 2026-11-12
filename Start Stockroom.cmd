@echo off
cd /d "%~dp0"
if not exist node_modules\next\dist\bin\next (
  echo Install dependencies with npm.cmd ci, then run npm.cmd run setup.
  pause
  exit /b 1
)
if not exist .next\BUILD_ID (
  call npm.cmd run build
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Open http://127.0.0.1:3000 in your browser.
echo Press Ctrl+C in this window to stop Stockroom.
call npm.cmd run start
if errorlevel 1 pause
