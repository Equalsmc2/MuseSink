@echo off
setlocal
cd /d "%~dp0"
echo MuseSink v3.0 - Local preview
 echo Open http://localhost:8765 in your browser.
echo To connect with friends online, publish to GitHub Pages
 echo and enable the new Firebase rules.
echo.
where py >nul 2>&1
if not errorlevel 1 (
  py -3 -m http.server 8765
) else (
  python -m http.server 8765
)
pause
