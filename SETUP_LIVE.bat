@echo off
setlocal
cd /d "%~dp0"
title MuseSink - Activate Live Multiplayer
where py >nul 2>&1
if %errorlevel%==0 (
  py -3 SETUP_LIVE.py
) else (
  where python >nul 2>&1
  if %errorlevel%==0 (
    python SETUP_LIVE.py
  ) else (
    echo Python 3 is required for the optional setup helper.
    echo You can also directly edit firebase-config.js following README.md.
  )
)
echo.
pause
